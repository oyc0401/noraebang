'use server'

import { Provider } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const PROVIDERS: Provider[] = ['TJ', 'KY', 'JOYSOUND']
const PAGE_SIZE = 50

type PresenceFilter = 'any' | 'with' | 'without'
type ProviderPresence = PresenceFilter

export type SongListFilters = {
  search?: string
  withoutArtist?: boolean
  providerPresence?: Partial<Record<Provider, ProviderPresence>>
  thumbnailPresence?: PresenceFilter
  titleKoPresence?: PresenceFilter
  cursor?: number
}

export async function getSongs(filters: SongListFilters = {}) {
  const {
    search,
    withoutArtist,
    providerPresence = {},
    thumbnailPresence = 'any',
    titleKoPresence = 'any',
    cursor
  } = filters

  const andConditions: any[] = []

  if (search?.trim()) {
    const keyword = search.trim()
    andConditions.push({
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { titleKo: { contains: keyword, mode: 'insensitive' } }
      ]
    })
  }

  if (withoutArtist) {
    andConditions.push({
      artistSongs: { none: {} }
    })
  }

  PROVIDERS.forEach(provider => {
    const presence = providerPresence[provider]
    if (!presence || presence === 'any') return

    if (presence === 'with') {
      andConditions.push({
        karaokeSongs: {
          some: { provider }
        }
      })
    } else if (presence === 'without') {
      andConditions.push({
        karaokeSongs: {
          none: { provider }
        }
      })
    }
  })

  if (cursor) {
    andConditions.push({
      id: { lt: cursor }
    })
  }

  if (thumbnailPresence === 'with') {
    andConditions.push({
      OR: [
        { thumbnailHigh: { not: null } },
        { thumbnailMedium: { not: null } },
        { thumbnailDefault: { not: null } }
      ]
    })
  } else if (thumbnailPresence === 'without') {
    andConditions.push({
      AND: [
        { thumbnailHigh: null },
        { thumbnailMedium: null },
        { thumbnailDefault: null }
      ]
    })
  }

  if (titleKoPresence === 'with') {
    andConditions.push({
      titleKo: { not: null }
    })
  } else if (titleKoPresence === 'without') {
    andConditions.push({
      titleKo: null
    })
  }

  const songs = await prisma.song.findMany({
    where: andConditions.length ? { AND: andConditions } : undefined,
    include: {
      artistSongs: {
        include: { artist: true },
        orderBy: { order: 'asc' }
      },
      karaokeSongs: true
    },
    orderBy: { id: 'desc' },
    take: PAGE_SIZE + 1
  })

  const hasMore = songs.length > PAGE_SIZE
  const visibleSongs = hasMore ? songs.slice(0, PAGE_SIZE) : songs
  const nextCursor = hasMore ? visibleSongs[visibleSongs.length - 1]?.id ?? null : null

  return {
    songs: visibleSongs.map(song => ({
      id: song.id,
      title: song.title,
      titleKo: song.titleKo ?? undefined,
      thumbnailDefault: song.thumbnailDefault ?? undefined,
      thumbnailMedium: song.thumbnailMedium ?? undefined,
      thumbnailHigh: song.thumbnailHigh ?? undefined,
      artists: song.artistSongs.map(as => ({
        id: as.artist.id,
        name: as.artist.name,
        nameKo: as.artist.nameKo
      })),
      karaokeProviders: PROVIDERS.reduce<Record<Provider, boolean>>((acc, provider) => {
        acc[provider] = song.karaokeSongs.some(ks => ks.provider === provider)
        return acc
      }, { TJ: false, KY: false, JOYSOUND: false })
    })),
    nextCursor
  }
}

export async function getSongDetail(songId: number) {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      artistSongs: {
        include: { artist: true },
        orderBy: { order: 'asc' }
      },
      karaokeSongs: true
    }
  })

  if (!song) {
    throw new Error('곡을 찾을 수 없습니다.')
  }

  return {
    id: song.id,
    title: song.title,
    titleKo: song.titleKo ?? undefined,
    thumbnailDefault: song.thumbnailDefault ?? undefined,
    thumbnailMedium: song.thumbnailMedium ?? undefined,
    thumbnailHigh: song.thumbnailHigh ?? undefined,
    artists: song.artistSongs.map(as => ({
      artistId: as.artist.id,
      name: as.artist.name,
      nameKo: as.artist.nameKo
    })),
    karaokeSongs: song.karaokeSongs.map(ks => ({
      id: ks.id,
      provider: ks.provider,
      karaokeNo: ks.karaokeNo
    }))
  }
}

export async function searchArtists(keyword: string) {
  const term = keyword.trim()
  if (!term) return []

  const artists = await prisma.artist.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { nameKo: { contains: term, mode: 'insensitive' } },
        { alias: { contains: term, mode: 'insensitive' } }
      ]
    },
    orderBy: { nameKo: 'asc' },
    take: 20
  })

  return artists.map(artist => ({
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    alias: artist.alias ?? undefined
  }))
}

export async function connectArtistToSong(songId: number, artistId: number) {
  await prisma.artistSong.upsert({
    where: {
      artistId_songId: {
        artistId,
        songId
      }
    },
    update: {},
    create: {
      songId,
      artistId
    }
  })

  return getSongDetail(songId)
}

export async function disconnectArtistFromSong(songId: number, artistId: number) {
  await prisma.artistSong.delete({
    where: {
      artistId_songId: {
        artistId,
        songId
      }
    }
  })

  return getSongDetail(songId)
}

export async function updateSongTitles(songId: number, title: string, titleKo?: string) {
  const trimmedTitle = title.trim()
  const trimmedTitleKo = titleKo?.trim()

  if (!trimmedTitle) {
    throw new Error('제목을 입력해주세요.')
  }

  await prisma.song.update({
    where: { id: songId },
    data: {
      title: trimmedTitle,
      titleKo: trimmedTitleKo || undefined
    }
  })

  return getSongDetail(songId)
}

export async function upsertKaraokeNumber(songId: number, provider: Provider, karaokeNo: string) {
  const trimmedNo = karaokeNo.trim()
  if (!trimmedNo) {
    throw new Error('노래방 번호를 입력해주세요.')
  }

  const existing = await prisma.karaokeSong.findFirst({
    where: { songId, provider }
  })

  if (existing) {
    await prisma.karaokeSong.update({
      where: { id: existing.id },
      data: { karaokeNo: trimmedNo }
    })
  } else {
    await prisma.karaokeSong.create({
      data: {
        songId,
        provider,
        karaokeNo: trimmedNo
      }
    })
  }

  return getSongDetail(songId)
}

export async function deleteKaraokeNumber(songId: number, provider: Provider) {
  const existing = await prisma.karaokeSong.findFirst({
    where: { songId, provider }
  })

  if (!existing) {
    throw new Error('노래방 번호를 찾을 수 없습니다.')
  }

  await prisma.karaokeSong.delete({
    where: { id: existing.id }
  })

  return getSongDetail(songId)
}

type ThumbnailPayload = {
  thumbnailDefault?: string
  thumbnailMedium?: string
  thumbnailHigh?: string
}

export async function updateSongThumbnails(songId: number, thumbnails: ThumbnailPayload) {
  const normalizedDefault = thumbnails.thumbnailDefault?.trim() || null
  const normalizedMedium = thumbnails.thumbnailMedium?.trim() || null
  const normalizedHigh = thumbnails.thumbnailHigh?.trim() || null

  await prisma.song.update({
    where: { id: songId },
    data: {
      thumbnailDefault: normalizedDefault,
      thumbnailMedium: normalizedMedium,
      thumbnailHigh: normalizedHigh
    }
  })

  return getSongDetail(songId)
}

export async function deleteSong(songId: number) {
  await prisma.song.delete({
    where: { id: songId }
  })

  return { success: true }
}
