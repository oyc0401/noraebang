'use server'

import { ChannelType } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { buildYoutubeChannelData, fetchChannelFromYoutube, parseChannelIdentifier } from '@/lib/youtube'

export type TjArtistSummary = Awaited<ReturnType<typeof getTjArtists>>[number]
export type SongSavedFilter = 'all' | 'saved' | 'unsaved'
export type RealArtistSummary = Awaited<ReturnType<typeof getRealArtists>>[number]
export type NamedArtistSummary = {
  id: number
  name: string
  nameKo: string
}

export async function getTjArtists() {
  const rows = await prisma.$queryRaw<
    {
      artist_name: string
      total_songs: bigint
      saved_songs: bigint
    }[]
  >`
    SELECT artist_name,
           COUNT(*)::bigint AS total_songs,
           COALESCE(SUM(CASE WHEN saved THEN 1 ELSE 0 END), 0)::bigint AS saved_songs
    FROM (
      SELECT unnest("artist_list") AS artist_name, saved
      FROM "tj_song"
    ) AS base
    WHERE artist_name IS NOT NULL
      AND artist_name <> ''
    GROUP BY artist_name
  `

  return rows.map(row => {
    const total = Number(row.total_songs)
    const saved = Number(row.saved_songs)

    return {
      name: row.artist_name,
      totalSongs: total,
      savedSongs: saved,
      unsavedSongs: total - saved
    }
  })
}

export async function getTjSongsByArtist(artistName: string, savedFilter: SongSavedFilter = 'all') {
  const trimmedName = artistName.trim()
  if (!trimmedName) return []

  const songs = await prisma.tjSong.findMany({
    where: {
      artistList: {
        has: trimmedName
      },
      ...(savedFilter === 'saved'
        ? { saved: true }
        : savedFilter === 'unsaved'
          ? { saved: false }
          : {})
    },
    orderBy: [{ releasedYearMonth: 'desc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      artist: true,
      artistList: true,
      featureList: true,
      saved: true,
      releasedYearMonth: true,
      lyricist: true,
      composer: true,
      producerList: true,
      nationType: true
    }
  })

  return songs.map(song => ({
    id: song.id,
    title: song.title,
    artist: song.artist ?? undefined,
    artistList: song.artistList,
    featureList: song.featureList,
    saved: song.saved,
    releasedYearMonth: song.releasedYearMonth,
    lyricist: song.lyricist ?? undefined,
    composer: song.composer ?? undefined,
    producerList: song.producerList,
    nationType: song.nationType
  }))
}

export async function getRealArtists(search?: string) {
  const term = search?.trim() || undefined

  const artists = await prisma.artist.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { nameKo: { contains: term, mode: 'insensitive' } },
            { alias: { contains: term, mode: 'insensitive' } }
          ]
        }
      : undefined,
    include: {
      _count: { select: { artistSongs: true } }
    },
    orderBy: term
      ? [{ nameKo: 'asc' }]
      : [{ artistSongs: { _count: 'desc' } }, { nameKo: 'asc' }]
  })

  return artists.map(artist => ({
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    alias: artist.alias ?? undefined,
    songCount: artist._count.artistSongs
  }))
}

export async function getArtistsByExactName(name: string): Promise<NamedArtistSummary[]> {
  const term = name.trim()
  if (!term) return []

  const artists = await prisma.artist.findMany({
    where: {
      OR: [
        { name: { equals: term, mode: 'insensitive' } },
        { nameKo: { equals: term, mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      nameKo: true
    },
    orderBy: { id: 'asc' }
  })

  return artists
}

export async function checkArtistConflicts(input: { name?: string; nameKo?: string }) {
  const name = input.name?.trim()
  const nameKo = input.nameKo?.trim()

  const result = {
    name: false,
    nameKo: false
  }

  const conditions = []
  if (name) conditions.push({ name: { equals: name, mode: 'insensitive' } })
  if (nameKo) conditions.push({ nameKo: { equals: nameKo, mode: 'insensitive' } })

  if (conditions.length === 0) return result

  const duplicates = await prisma.artist.findMany({
    where: { OR: conditions },
    select: { name: true, nameKo: true }
  })

  duplicates.forEach(artist => {
    if (name && artist.name.toLowerCase() === name.toLowerCase()) result.name = true
    if (nameKo && artist.nameKo.toLowerCase() === nameKo.toLowerCase()) result.nameKo = true
  })

  return result
}

export async function createArtist(input: {
  name: string
  nameKo?: string
  tjSongRequestUrl?: string
  youtubeMainUrl?: string
  youtubeTopicUrl?: string
}) {
  const name = input.name.trim()
  const nameKoInput = input.nameKo?.trim()

  if (!name) {
    throw new Error('이름과 한국어 이름을 모두 입력해주세요.')
  }

  const conflicts = await checkArtistConflicts({ name, nameKo: nameKoInput })
  if (conflicts.name) {
    throw new Error('이미 존재하는 영문명이 있습니다.')
  }
  if (nameKoInput && conflicts.nameKo) {
    throw new Error('이미 존재하는 한글명이 있습니다.')
  }

  const youtubeInputs: { type: ChannelType; url: string; channel: any }[] = []

  const trimmedMain = input.youtubeMainUrl?.trim()
  if (trimmedMain) {
    const identifier = parseChannelIdentifier(trimmedMain)
    const channel = await fetchChannelFromYoutube(identifier)
    youtubeInputs.push({ type: ChannelType.MAIN, url: trimmedMain, channel })
  }

  const trimmedTopic = input.youtubeTopicUrl?.trim()
  if (trimmedTopic) {
    const identifier = parseChannelIdentifier(trimmedTopic)
    const channel = await fetchChannelFromYoutube(identifier)
    youtubeInputs.push({ type: ChannelType.TOPIC, url: trimmedTopic, channel })
  }

  const result = await prisma.$transaction(async tx => {
    const targetNameKo = nameKoInput || name

    const created = await tx.artist.create({
      data: {
        name,
        nameKo: targetNameKo,
        tjSongRequestUrl: input.tjSongRequestUrl?.trim() || undefined,
      }
    })

    for (const entry of youtubeInputs) {
      const commonData = buildYoutubeChannelData(entry.channel)
      await tx.youtubeChannel.create({
        data: {
          artistId: created.id,
          type: entry.type,
          ...commonData
        }
      })
    }

    return created
  })

  return {
    id: result.id,
    name: result.name,
    nameKo: result.nameKo
  }
}

async function mapTjSongsToArtist(artistId: number, tjSongIds: string[]) {
  if (!tjSongIds?.length) {
    return { mappedSongs: 0, createdSongs: 0 }
  }

  const uniqueIds = [...new Set(tjSongIds.filter(Boolean))]
  let createdSongs = 0
  let mappedSongs = 0

  for (const tjSongId of uniqueIds) {
    const existingKaraoke = await prisma.karaokeSong.findUnique({
      where: {
        provider_karaokeNo: {
          provider: 'TJ',
          karaokeNo: tjSongId
        }
      },
      select: {
        songId: true
      }
    })

    let songId: number | null = existingKaraoke?.songId ?? null

    if (!songId) {
      const tjSong = await prisma.tjSong.findUnique({
        where: { id: tjSongId }
      })
      if (!tjSong) continue

      const createdSong = await prisma.song.create({
        data: {
          title: tjSong.title,
          titleKo: tjSong.title
        }
      })

      await prisma.karaokeSong.create({
        data: {
          songId: createdSong.id,
          provider: 'TJ',
          karaokeNo: tjSongId
        }
      })

      songId = createdSong.id
      createdSongs += 1
    }

    if (!songId) continue

    await prisma.artistSong.upsert({
      where: {
        artistId_songId: {
          artistId,
          songId
        }
      },
      update: {},
      create: {
        artistId,
        songId
      }
    })

    mappedSongs += 1
  }

  await prisma.tjSong.updateMany({
    where: { id: { in: uniqueIds } },
    data: { saved: true }
  })

  return { mappedSongs, createdSongs }
}

export async function createArtistAndMapSongs(input: {
  name: string
  nameKo?: string
  tjSongRequestUrl?: string
  youtubeMainUrl?: string
  youtubeTopicUrl?: string
  tjSongIds: string[]
}) {
  const artist = await createArtist({
    name: input.name,
    nameKo: input.nameKo,
    tjSongRequestUrl: input.tjSongRequestUrl,
    youtubeMainUrl: input.youtubeMainUrl,
    youtubeTopicUrl: input.youtubeTopicUrl
  })

  const stats = await mapTjSongsToArtist(artist.id, input.tjSongIds ?? [])

  return {
    artist,
    ...stats
  }
}

export async function mapSongsToArtist(artistId: number, tjSongIds: string[]) {
  return mapTjSongsToArtist(artistId, tjSongIds)
}
