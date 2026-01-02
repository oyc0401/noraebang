'use server'

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

type SortOption = 'id_desc' | 'name_asc' | 'name_desc' | 'subscriber_desc' | 'subscriber_asc' | 'song_count_desc' | 'song_count_asc'

export async function getArtists(sort?: SortOption) {
  let orderBy: any = {}

  if (sort === 'id_desc') orderBy.id = 'desc'
  else if (sort === 'name_asc') orderBy.nameKo = 'asc'
  else if (sort === 'name_desc') orderBy.nameKo = 'desc'
  else if (sort === 'subscriber_desc') orderBy = { youtubeChannel: { subscriberCount: 'desc' } }
  else if (sort === 'subscriber_asc') orderBy = { youtubeChannel: { subscriberCount: 'asc' } }
  else if (sort === 'song_count_desc') orderBy = { artistSongs: { _count: 'desc' } }
  else if (sort === 'song_count_asc') orderBy = { artistSongs: { _count: 'asc' } }
  else orderBy.nameKo = 'asc'

  const artists = await prisma.artist.findMany({
    include: {
      youtubeChannel: true,
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
    youtube: a.youtubeChannel ? {
      channelId: a.youtubeChannel.channelId,
      title: a.youtubeChannel.title ?? undefined,
      customUrl: a.youtubeChannel.customUrl ?? undefined,
      description: a.youtubeChannel.description ?? undefined,
      subscriberCount: a.youtubeChannel.subscriberCount ?? undefined,
      videoCount: a.youtubeChannel.videoCount ?? undefined,
      thumbnailDefault: a.youtubeChannel.thumbnailDefault ?? undefined,
      thumbnailMedium: a.youtubeChannel.thumbnailMedium ?? undefined,
      thumbnailHigh: a.youtubeChannel.thumbnailHigh ?? undefined,
    } : undefined,
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

export async function updateYoutubeChannel(artistId: number, channelId: string) {
  // YouTube API 호출해서 채널 정보 가져오기
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
  if (!YOUTUBE_API_KEY) throw new Error('YouTube API key not configured')

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${encodeURIComponent(channelId)}&key=${YOUTUBE_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()

  if (!data.items || data.items.length === 0) {
    throw new Error('YouTube channel not found')
  }

  const channel = data.items[0]
  const snippet = channel.snippet
  const statistics = channel.statistics
  const branding = channel.brandingSettings?.channel

  // DB 업데이트
  const updated = await prisma.youtubeChannel.upsert({
    where: { artistId },
    create: {
      artistId,
      channelId: channel.id,
      title: snippet.title,
      description: snippet.description,
      customUrl: snippet.customUrl,
      publishedAt: new Date(snippet.publishedAt),
      country: snippet.country,
      defaultLanguage: snippet.defaultLanguage,
      thumbnailDefault: snippet.thumbnails?.default?.url,
      thumbnailMedium: snippet.thumbnails?.medium?.url,
      thumbnailHigh: snippet.thumbnails?.high?.url,
      subscriberCount: statistics?.subscriberCount ? parseInt(statistics.subscriberCount) : undefined,
      videoCount: statistics?.videoCount ? parseInt(statistics.videoCount) : undefined,
      viewCount: statistics?.viewCount ? BigInt(statistics.viewCount) : undefined,
      hiddenSubscriberCount: statistics?.hiddenSubscriberCount,
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
      fetchedAt: new Date(),
    },
    update: {
      channelId: channel.id,
      title: snippet.title,
      description: snippet.description,
      customUrl: snippet.customUrl,
      publishedAt: new Date(snippet.publishedAt),
      country: snippet.country,
      defaultLanguage: snippet.defaultLanguage,
      thumbnailDefault: snippet.thumbnails?.default?.url,
      thumbnailMedium: snippet.thumbnails?.medium?.url,
      thumbnailHigh: snippet.thumbnails?.high?.url,
      subscriberCount: statistics?.subscriberCount ? parseInt(statistics.subscriberCount) : undefined,
      videoCount: statistics?.videoCount ? parseInt(statistics.videoCount) : undefined,
      viewCount: statistics?.viewCount ? BigInt(statistics.viewCount) : undefined,
      hiddenSubscriberCount: statistics?.hiddenSubscriberCount,
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
      fetchedAt: new Date(),
    }
  })

  // 아티스트 썸네일도 업데이트
  await prisma.artist.update({
    where: { id: artistId },
    data: {
      thumbnailDefault: snippet.thumbnails?.default?.url,
      thumbnailMedium: snippet.thumbnails?.medium?.url,
      thumbnailHigh: snippet.thumbnails?.high?.url,
    }
  })

  return {
    channelTitle: updated.title ?? undefined,
    message: 'YouTube channel updated'
  }
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
