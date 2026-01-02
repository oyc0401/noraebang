"use server";

import type { ChannelType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const CHANNEL_ID_REGEX = /^UC[0-9A-Za-z_-]{22}$/;

type ChannelIdentifier = {
  channelId?: string;
  handle?: string;
  username?: string;
  query?: string;
};

function sanitizePotentialId(value: string) {
  return value.split("?")[0].split("&")[0].trim();
}

function parseChannelIdentifier(raw: string): ChannelIdentifier {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("YouTube 채널 URL 또는 ID를 입력해주세요.");
  }

  const possibleDirectId = sanitizePotentialId(trimmed);
  if (CHANNEL_ID_REGEX.test(possibleDirectId)) {
    return { channelId: possibleDirectId };
  }

  const maybeUrl = tryParseUrl(trimmed);
  if (maybeUrl) {
    const pathSegments = maybeUrl.pathname
      .split("/")
      .map((seg) => seg.trim())
      .filter(Boolean);

    if (pathSegments[0]?.startsWith("@")) {
      const handle = pathSegments[0].replace(/^@/, "");
      if (handle) return { handle };
    }

    if (pathSegments[0] === "channel" && pathSegments[1]) {
      const candidateId = sanitizePotentialId(pathSegments[1]);
      if (CHANNEL_ID_REGEX.test(candidateId)) {
        return { channelId: candidateId };
      }
    }

    if (pathSegments[0] === "user" && pathSegments[1]) {
      return { username: pathSegments[1] };
    }

    if (pathSegments[0] === "c" && pathSegments[1]) {
      return { query: pathSegments[1] };
    }

    if (
      !pathSegments.length &&
      maybeUrl.host.includes("youtube.com") &&
      maybeUrl.hash.startsWith("#@")
    ) {
      return { handle: maybeUrl.hash.replace("#@", "") };
    }
  }

  if (trimmed.startsWith("@")) {
    return { handle: trimmed.replace(/^@/, "") };
  }

  return { query: trimmed };
}

function tryParseUrl(value: string) {
  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value);
    }

    return new URL(`https://${value}`);
  } catch {
    return null;
  }
}

async function fetchChannelFromYoutube(identifier: ChannelIdentifier) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API 키가 설정되지 않았습니다.");
  }

  const baseUrl = "https://www.googleapis.com/youtube/v3";

  async function fetchByChannelId(channelId: string) {
    const url = `${baseUrl}/channels?part=snippet,statistics,brandingSettings&id=${encodeURIComponent(channelId)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("YouTube API 호출에 실패했습니다.");
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error("해당 채널 정보를 찾을 수 없습니다.");
    }

    return data.items[0];
  }

  async function fetchByUsername(username: string) {
    const url = `${baseUrl}/channels?part=snippet,statistics,brandingSettings&forUsername=${encodeURIComponent(username)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;
    return data.items[0];
  }

  async function fetchByHandle(handle: string) {
    const url = `${baseUrl}/channels?part=snippet,statistics,brandingSettings&forHandle=${encodeURIComponent(handle)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;
    return data.items[0];
  }

  if (identifier.channelId) {
    return fetchByChannelId(identifier.channelId);
  }

  if (identifier.handle) {
    const result = await fetchByHandle(identifier.handle);
    if (result) return result;
  }

  if (identifier.username) {
    const result = await fetchByUsername(identifier.username);
    if (result) return result;
  }

  const searchTerm = identifier.handle
    ? `@${identifier.handle}`
    : identifier.query;

  if (!searchTerm) {
    throw new Error("채널 식별자를 알 수 없습니다. 주소를 다시 확인해주세요.");
  }

  const searchUrl = `${baseUrl}/search?part=snippet&type=channel&maxResults=5&q=${encodeURIComponent(searchTerm)}&key=${YOUTUBE_API_KEY}`;
  const searchRes = await fetch(searchUrl, { cache: "no-store" });

  if (!searchRes.ok) {
    throw new Error("YouTube 채널 검색 중 오류가 발생했습니다.");
  }

  const searchData = await searchRes.json();
  if (!searchData.items || searchData.items.length === 0) {
    throw new Error("검색된 채널이 없습니다.");
  }

  const candidate = pickBestSearchCandidate(
    searchData.items,
    identifier.handle,
  );

  if (!candidate?.id?.channelId) {
    throw new Error("검색 결과에서 채널 ID를 확인할 수 없습니다.");
  }

  return fetchByChannelId(candidate.id.channelId);
}

function pickBestSearchCandidate(items: any[], handle?: string) {
  if (!items || items.length === 0) return null;
  if (!handle) return items[0];

  const normalized = handle.toLowerCase();
  return (
    items.find((item) => {
      const customUrl = item.snippet?.customUrl ?? "";
      const title = item.snippet?.channelTitle ?? "";
      return (
        customUrl.toLowerCase() === normalized ||
        title.toLowerCase() === normalized
      );
    }) ?? items[0]
  );
}

export async function getYoutubeArtists() {
  const artists = await prisma.artist.findMany({
    orderBy: { nameKo: "asc" },
  });

  const artistIds = artists.map((artist) => artist.id);
  const youtubeChannels = artistIds.length
    ? await prisma.youtubeChannel.findMany({
        where: {
          artistId: { in: artistIds },
        },
      })
    : [];

  const channelsByArtist = new Map<number, typeof youtubeChannels>();
  for (const channel of youtubeChannels) {
    const list = channelsByArtist.get(channel.artistId);
    if (list) list.push(channel);
    else channelsByArtist.set(channel.artistId, [channel]);
  }

  const typeOrder: Record<ChannelType, number> = {
    MAIN: 0,
    TOPIC: 1,
  };

  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    alias: artist.alias ?? undefined,
    thumbnailDefault: artist.thumbnailDefault ?? undefined,
    thumbnailMedium: artist.thumbnailMedium ?? undefined,
    thumbnailHigh: artist.thumbnailHigh ?? undefined,
    youtubeChannels: (channelsByArtist.get(artist.id) ?? [])
      .sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
      .map((channel) => ({
        id: channel.id,
        type: channel.type,
        channelId: channel.channelId,
        title: channel.title ?? undefined,
        description: channel.description ?? undefined,
        customUrl: channel.customUrl ?? undefined,
        subscriberCount: channel.subscriberCount ?? undefined,
        videoCount: channel.videoCount ?? undefined,
        thumbnailDefault: channel.thumbnailDefault ?? undefined,
        thumbnailMedium: channel.thumbnailMedium ?? undefined,
        thumbnailHigh: channel.thumbnailHigh ?? undefined,
        updatedAt: channel.updatedAt.toISOString(),
      })),
  }));
}

export async function upsertYoutubeChannel(
  artistId: number,
  type: ChannelType,
  input: string,
) {
  const identifier = parseChannelIdentifier(input);
  const channel = await fetchChannelFromYoutube(identifier);

  const snippet = channel.snippet ?? {};
  const statistics = channel.statistics ?? {};
  const branding = channel.brandingSettings?.channel ?? {};

  const subscriberCount = statistics.subscriberCount
    ? parseInt(statistics.subscriberCount, 10)
    : undefined;
  const videoCount = statistics.videoCount
    ? parseInt(statistics.videoCount, 10)
    : undefined;
  const viewCount = statistics.viewCount
    ? BigInt(statistics.viewCount)
    : undefined;
  const hiddenSubscriberCount =
    typeof statistics.hiddenSubscriberCount === "boolean"
      ? statistics.hiddenSubscriberCount
      : undefined;

  const existing = await prisma.youtubeChannel.findFirst({
    where: { artistId, type },
  });

  const commonData = {
    channelId: channel.id,
    title: snippet.title,
    description: snippet.description ?? branding.description ?? undefined,
    customUrl: snippet.customUrl ?? undefined,
    publishedAt: snippet.publishedAt
      ? new Date(snippet.publishedAt)
      : undefined,
    country: branding.country ?? snippet.country ?? undefined,
    defaultLanguage: snippet.defaultLanguage ?? undefined,
    thumbnailDefault: snippet.thumbnails?.default?.url,
    thumbnailMedium: snippet.thumbnails?.medium?.url,
    thumbnailHigh: snippet.thumbnails?.high?.url,
    subscriberCount,
    videoCount,
    viewCount,
    hiddenSubscriberCount,
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
    fetchedAt: new Date(),
  };

  const upserted = existing
    ? await prisma.youtubeChannel.update({
        where: { id: existing.id },
        data: commonData,
      })
    : await prisma.youtubeChannel.create({
        data: {
          artistId,
          type,
          ...commonData,
        },
      });

  return {
    id: upserted.id,
    type: upserted.type,
    title: upserted.title ?? undefined,
  };
}

export async function deleteYoutubeChannel(
  artistId: number,
  type: ChannelType,
) {
  const target = await prisma.youtubeChannel.findFirst({
    where: { artistId, type },
  });

  if (!target) {
    throw new Error("삭제할 채널 정보를 찾지 못했습니다.");
  }

  await prisma.youtubeChannel.delete({
    where: { id: target.id },
  });

  return { success: true };
}
