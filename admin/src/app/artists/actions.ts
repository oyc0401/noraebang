'use server'

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

type SortOption = 'id_desc' | 'name_asc' | 'name_desc' | 'song_count_desc' | 'song_count_asc'

export async function getArtists(sort?: SortOption) {
  let orderBy: any = {}

  if (sort === 'id_desc') orderBy.id = 'desc'
  else if (sort === 'name_asc') orderBy.nameKo = 'asc'
  else if (sort === 'name_desc') orderBy.nameKo = 'desc'
  else if (sort === 'song_count_desc') orderBy = { artistSongs: { _count: 'desc' } }
  else if (sort === 'song_count_asc') orderBy = { artistSongs: { _count: 'asc' } }
  else orderBy.nameKo = 'asc'

  const artists = await prisma.artist.findMany({
    include: {
      _count: {
        select: { artistSongs: true }
      }
    },
    orderBy
  })

  return artists.map(a => ({
    id: a.id,
    name: a.name,
    nameKo: a.nameKo,
    alias: a.alias ?? undefined,
    thumbnailDefault: a.thumbnailDefault ?? undefined,
    thumbnailMedium: a.thumbnailMedium ?? undefined,
    thumbnailHigh: a.thumbnailHigh ?? undefined,
    songCount: a._count.artistSongs,
    aliasGroup: undefined
  }))
}

export async function getSongsByArtist(artistId: number) {
  const songs = await prisma.artistSong.findMany({
    where: { artistId },
    include: {
      song: {
        include: {
          karaokeSongs: true
        }
      }
    },
    orderBy: { order: 'asc' }
  })

  return songs.map(as => ({
    id: as.song.id,
    title: as.song.title,
    titleKo: as.song.titleKo ?? undefined,
    karaokeSongs: as.song.karaokeSongs.map(ks => ({
      provider: ks.provider,
      karaokeNo: ks.karaokeNo
    }))
  }))
}

export async function updateArtistAlias(artistId: number, alias: string) {
  const sanitizedAlias = alias.trim().replace(/^@/, '')

  if (!sanitizedAlias) {
    throw new Error('별칭을 입력해주세요.')
  }

  try {
    const updated = await prisma.artist.update({
      where: { id: artistId },
      data: { alias: sanitizedAlias },
      select: { id: true, alias: true }
    })

    return {
      alias: updated.alias ?? undefined
    }
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('이미 존재하는 별칭입니다.')
    }

    throw error
  }
}

export async function updateArtistName(artistId: number, name: string) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error('이름을 입력해주세요.')
  }

  const updated = await prisma.artist.update({
    where: { id: artistId },
    data: { name: trimmedName },
    select: { id: true, name: true }
  })

  return {
    name: updated.name
  }
}

export async function updateArtistNameKo(artistId: number, nameKo: string) {
  const trimmedNameKo = nameKo.trim()

  if (!trimmedNameKo) {
    throw new Error('한국어 이름을 입력해주세요.')
  }

  const updated = await prisma.artist.update({
    where: { id: artistId },
    data: { nameKo: trimmedNameKo },
    select: { id: true, nameKo: true }
  })

  return {
    nameKo: updated.nameKo
  }
}

export async function updateSongTitle(songId: number, title: string, titleKo?: string) {
  const trimmedTitle = title.trim()

  if (!trimmedTitle) {
    throw new Error('제목을 입력해주세요.')
  }

  const updated = await prisma.song.update({
    where: { id: songId },
    data: {
      title: trimmedTitle,
      titleKo: titleKo?.trim() || undefined
    },
    select: { id: true, title: true, titleKo: true }
  })

  return {
    title: updated.title,
    titleKo: updated.titleKo ?? undefined
  }
}

export async function createKaraokeSong(songId: number, provider: 'TJ' | 'KY' | 'JOYSOUND', karaokeNo: string) {
  const trimmedNo = karaokeNo.trim()

  if (!trimmedNo) {
    throw new Error('노래방 번호를 입력해주세요.')
  }

  const created = await prisma.karaokeSong.create({
    data: {
      songId,
      provider,
      karaokeNo: trimmedNo
    }
  })

  return created
}

export async function updateKaraokeSong(songId: number, provider: 'TJ' | 'KY' | 'JOYSOUND', karaokeNo: string) {
  const trimmedNo = karaokeNo.trim()

  if (!trimmedNo) {
    throw new Error('노래방 번호를 입력해주세요.')
  }

  const existing = await prisma.karaokeSong.findFirst({
    where: {
      songId,
      provider
    }
  })

  if (!existing) {
    throw new Error('노래방 번호를 찾을 수 없습니다.')
  }

  const updated = await prisma.karaokeSong.update({
    where: { id: existing.id },
    data: {
      karaokeNo: trimmedNo
    }
  })

  return updated
}

export async function deleteKaraokeSong(songId: number, provider: 'TJ' | 'KY' | 'JOYSOUND') {
  const existing = await prisma.karaokeSong.findFirst({
    where: {
      songId,
      provider
    }
  })

  if (!existing) {
    throw new Error('노래방 번호를 찾을 수 없습니다.')
  }

  await prisma.karaokeSong.delete({
    where: { id: existing.id }
  })

  return { success: true }
}
