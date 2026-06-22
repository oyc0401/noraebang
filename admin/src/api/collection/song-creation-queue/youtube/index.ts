import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { normalizeTitle } from "../../../../lib/normalizer";
import { findBestMatch } from "../../../../lib/text-matcher";

export type SearchYoutubeVideoTjSong = {
  title: string;
  artistId: number;
};

export type YoutubeVideoMatch = {
  id: string;
  channelId: string | null;
  title: string;
  description: string | null;
  publishedAt: Date | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  isBestMatch: boolean;
};

type YoutubeVideoRow = {
  id: string;
  channel_id: string | null;
  title: string | null;
  description: string | null;
  published_at: Date | null;
  thumbnail_default: string | null;
  thumbnail_medium: string | null;
  thumbnail_high: string | null;
};

// tjSong과 artistId로 아티스트의 유튜브 채널들을 찾고, 그 채널의 영상들 중에서 제목이 일치하는 영상들을 찾는다.
export async function searchYoutubeVideo(
  tjSong: SearchYoutubeVideoTjSong,
): Promise<YoutubeVideoMatch[]> {
  const title = normalizeNullable(tjSong.title);

  if (!title) {
    return [];
  }

  const channelIds = await getArtistYoutubeChannelIds(tjSong.artistId);

  if (channelIds.length === 0) {
    return [];
  }

  const videos = await findYoutubeVideosByChannel(channelIds);

  return matchVideosToTitle(title, videos);
}

async function getArtistYoutubeChannelIds(artistId: number): Promise<string[]> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
  });

  try {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: { youtube_channel: true, youtube_topic_channel: true },
    });

    if (!artist) {
      return [];
    }

    return normalizeChannelIds([
      artist.youtube_channel,
      artist.youtube_topic_channel,
    ]);
  } finally {
    await prisma.$disconnect();
  }
}

async function findYoutubeVideosByChannel(
  channelIds: string[],
): Promise<YoutubeVideoRow[]> {
  const client = new Client({
    connectionString: getMediaDatabaseUrl(),
  });

  await client.connect();

  try {
    const result = await client.query<YoutubeVideoRow>(
      `
        select
          id,
          channel_id,
          title,
          description,
          published_at,
          thumbnail_default,
          thumbnail_medium,
          thumbnail_high
        from youtube_video
        where channel_id = any($1::text[])
        order by published_at desc nulls last, updated_at desc
      `,
      [channelIds],
    );

    return result.rows;
  } finally {
    await client.end();
  }
}

function matchVideosToTitle(
  songTitle: string,
  videos: YoutubeVideoRow[],
): YoutubeVideoMatch[] {
  const videosByNormalizedTitle = new Map<string, YoutubeVideoRow[]>();

  for (const video of videos) {
    const rawTitle = normalizeNullable(video.title);
    if (!rawTitle) continue;

    const normalizedTitle = normalizeTitle(rawTitle);
    const bucket = videosByNormalizedTitle.get(normalizedTitle) ?? [];
    bucket.push(video);
    videosByNormalizedTitle.set(normalizedTitle, bucket);
  }

  const candidateTitles = Array.from(videosByNormalizedTitle.keys());

  if (candidateTitles.length === 0) {
    return [];
  }

  const { answer, candidate } = findBestMatch(
    normalizeTitle(songTitle),
    candidateTitles,
  );

  const matches: YoutubeVideoMatch[] = [];

  for (const normalizedTitle of answer ? [answer, ...candidate] : candidate) {
    const bucket = videosByNormalizedTitle.get(normalizedTitle) ?? [];
    for (const video of bucket) {
      matches.push(toMatch(video, normalizedTitle === answer));
    }
  }

  return matches;
}

function toMatch(row: YoutubeVideoRow, isBestMatch: boolean): YoutubeVideoMatch {
  return {
    id: row.id,
    channelId: row.channel_id,
    title: normalizeNullable(row.title) ?? "",
    description: row.description,
    publishedAt: row.published_at,
    thumbnailDefault: row.thumbnail_default,
    thumbnailMedium: row.thumbnail_medium,
    thumbnailHigh: row.thumbnail_high,
    isBestMatch,
  };
}

function normalizeChannelIds(
  channelIds: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(
      channelIds
        .map((channelId) => normalizeNullable(channelId))
        .filter((channelId): channelId is string => channelId !== null),
    ),
  );
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || null;
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

function getMediaDatabaseUrl(): string {
  const databaseUrl = process.env.MEDIA_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("MEDIA_DATABASE_URL is required");
  }

  return databaseUrl;
}
