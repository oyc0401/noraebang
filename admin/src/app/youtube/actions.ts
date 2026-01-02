'use server'

import { prisma } from '@/lib/prisma'

export async function getArtistsForYoutube(searchQuery?: string) {
  const where = searchQuery
    ? {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' as any } },
          { nameKo: { contains: searchQuery, mode: 'insensitive' as any } },
          { alias: { contains: searchQuery, mode: 'insensitive' as any } },
        ],
      }
    : {}

  const artists = await prisma.artist.findMany({
    where,
    include: {
      youtubeChannel: true,
    },
    orderBy: { nameKo: 'asc' },
  })

  return artists.map((a) => ({
    id: a.id,
    name: a.name,
    nameKo: a.nameKo,
    alias: a.alias ?? undefined,
    youtube: a.youtubeChannel
      ? {
          channelId: a.youtubeChannel.channelId,
          title: a.youtubeChannel.title ?? undefined,
          customUrl: a.youtubeChannel.customUrl ?? undefined,
          description: a.youtubeChannel.description ?? undefined,
          subscriberCount: a.youtubeChannel.subscriberCount ?? undefined,
          videoCount: a.youtubeChannel.videoCount ?? undefined,
          thumbnailDefault: a.youtubeChannel.thumbnailDefault ?? undefined,
          thumbnailMedium: a.youtubeChannel.thumbnailMedium ?? undefined,
          thumbnailHigh: a.youtubeChannel.thumbnailHigh ?? undefined,
        }
      : undefined,
  }))
}

export async function updateYoutubeChannelForYoutubePage(artistId: number, channelId: string) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
  if (!YOUTUBE_API_KEY) throw new Error('YouTube API key not configured')

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${encodeURIComponent(
    channelId
  )}&key=${YOUTUBE_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()

  if (!data.items || data.items.length === 0) {
    throw new Error('YouTube channel not found')
  }

  const channel = data.items[0]
  const snippet = channel.snippet
  const statistics = channel.statistics

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
    },
  })

  await prisma.artist.update({
    where: { id: artistId },
    data: {
      thumbnailDefault: snippet.thumbnails?.default?.url,
      thumbnailMedium: snippet.thumbnails?.medium?.url,
      thumbnailHigh: snippet.thumbnails?.high?.url,
    },
  })

  return {
    channelTitle: updated.title ?? undefined,
    message: 'YouTube channel updated',
  }
}
