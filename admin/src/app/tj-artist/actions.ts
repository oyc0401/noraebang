'use server'

import { prisma } from '@/lib/prisma'

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

export async function checkArtistConflicts(input: { name?: string; nameKo?: string; alias?: string }) {
  const name = input.name?.trim()
  const nameKo = input.nameKo?.trim()
  const alias = input.alias?.trim()

  const result = {
    name: false,
    nameKo: false,
    alias: false
  }

  const conditions = []
  if (name) conditions.push({ name: { equals: name, mode: 'insensitive' } })
  if (nameKo) conditions.push({ nameKo: { equals: nameKo, mode: 'insensitive' } })
  if (alias) conditions.push({ alias: { equals: alias, mode: 'insensitive' } })

  if (conditions.length === 0) return result

  const duplicates = await prisma.artist.findMany({
    where: { OR: conditions },
    select: { name: true, nameKo: true, alias: true }
  })

  duplicates.forEach(artist => {
    if (name && artist.name.toLowerCase() === name.toLowerCase()) result.name = true
    if (nameKo && artist.nameKo.toLowerCase() === nameKo.toLowerCase()) result.nameKo = true
    if (alias && artist.alias && artist.alias.toLowerCase() === alias.toLowerCase()) result.alias = true
  })

  return result
}

export async function createArtist(input: {
  name: string
  nameKo: string
  alias?: string
  tjSongRequestUrl?: string
  thumbnailDefault?: string
  thumbnailMedium?: string
  thumbnailHigh?: string
}) {
  const name = input.name.trim()
  const nameKo = input.nameKo.trim()
  const alias = input.alias?.trim()

  if (!name || !nameKo) {
    throw new Error('이름과 한국어 이름을 모두 입력해주세요.')
  }

  if (alias?.startsWith('@')) {
    throw new Error('별칭에서 @는 제외해주세요.')
  }

  const conflicts = await checkArtistConflicts({ name, nameKo, alias })
  if (conflicts.name) {
    throw new Error('이미 존재하는 영문명이 있습니다.')
  }
  if (conflicts.nameKo) {
    throw new Error('이미 존재하는 한글명이 있습니다.')
  }
  if (conflicts.alias) {
    throw new Error('이미 존재하는 별칭입니다.')
  }

  const created = await prisma.artist.create({
    data: {
      name,
      nameKo,
      alias: alias || undefined,
      tjSongRequestUrl: input.tjSongRequestUrl?.trim() || undefined,
      thumbnailDefault: input.thumbnailDefault?.trim() || undefined,
      thumbnailMedium: input.thumbnailMedium?.trim() || undefined,
      thumbnailHigh: input.thumbnailHigh?.trim() || undefined
    }
  })

  return {
    id: created.id,
    name: created.name,
    nameKo: created.nameKo,
    alias: created.alias ?? undefined
  }
}

export async function updateTjSongSavedStatus(songIds: string[], saved: boolean) {
  if (!songIds.length) {
    return { count: 0 }
  }

  const result = await prisma.tjSong.updateMany({
    where: { id: { in: songIds } },
    data: { saved }
  })

  return { count: result.count }
}
