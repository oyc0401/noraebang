import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { searchYoutubeVideos } from "../../../youtube";
import { searchSpotifyTrack, type SpotifyTrackMatch } from "./spotify";
import { searchYoutubeVideo, type YoutubeVideoMatch } from "./youtube";

export type SearchSongMediaResult = {
  titleJa: string | null;
  titleLatin: string | null;
  spotifyTracks: SpotifyTrackMatch[];
  youtubeVideos: YoutubeVideoMatch[];
};

// tjTitle/artistId로 titleJa·titleLatin을 추론하고, 두 제목으로 스포티파이/유튜브 매칭을 모아서 한번에 반환한다.
export async function searchSongMedia(
  tjTitle: string,
  artistId: number,
): Promise<SearchSongMediaResult> {
  const title = normalizeNullable(tjTitle);

  if (!title) {
    return emptyResult();
  }

  let titleJa = hasJapanese(title) ? title : null;
  let titleLatin = !titleJa && hasLatinOnly(title) ? title : null;

  // 유튜브 토픽채널 검색 1위를 정답곡으로 간주해, 우리가 못 구한 쪽(Ja/Latin) 제목을 채워본다.
  const topicTitle = await searchTopicChannelTopTitle(title, artistId);
  if (topicTitle) {
    if (!titleLatin && hasLatinOnly(topicTitle)) {
      titleLatin = topicTitle;
    } else if (!titleJa && hasJapanese(topicTitle)) {
      titleJa = topicTitle;
    }
  }

  if (titleJa && titleLatin) {
    const [spotifyJa, spotifyLatin, youtubeJa, youtubeLatin] = await Promise.all([
      searchSpotifyTrack(titleJa, artistId),
      searchSpotifyTrack(titleLatin, artistId),
      searchYoutubeVideo(titleJa, artistId),
      searchYoutubeVideo(titleLatin, artistId),
    ]);

    return {
      titleJa,
      titleLatin,
      spotifyTracks: mergeById(spotifyJa, spotifyLatin),
      youtubeVideos: mergeById(youtubeJa, youtubeLatin),
    };
  }

  if (titleJa) {
    const spotifyJa = await searchSpotifyTrack(titleJa, artistId);

    // 토픽채널에서 Latin을 못 찾았으면, 스포티파이 매칭 결과의 isrc로 MusicBrainz에서 한 번 더 찾아본다.
    const brainzLatin = await findLatinTitleFromMusicBrainz(spotifyJa);

    if (brainzLatin) {
      const [spotifyLatin, youtubeJa, youtubeLatin] = await Promise.all([
        searchSpotifyTrack(brainzLatin, artistId),
        searchYoutubeVideo(titleJa, artistId),
        searchYoutubeVideo(brainzLatin, artistId),
      ]);

      return {
        titleJa,
        titleLatin: brainzLatin,
        spotifyTracks: mergeById(spotifyJa, spotifyLatin),
        youtubeVideos: mergeById(youtubeJa, youtubeLatin),
      };
    }

    const youtubeJa = await searchYoutubeVideo(titleJa, artistId);

    return {
      titleJa,
      titleLatin: null,
      spotifyTracks: spotifyJa,
      youtubeVideos: youtubeJa,
    };
  }

  if (titleLatin) {
    const [spotifyLatin, youtubeLatin] = await Promise.all([
      searchSpotifyTrack(titleLatin, artistId),
      searchYoutubeVideo(titleLatin, artistId),
    ]);

    return {
      titleJa: null,
      titleLatin,
      spotifyTracks: spotifyLatin,
      youtubeVideos: youtubeLatin,
    };
  }

  // 일본어/영어 어느 쪽으로도 분류 안 되면 원문 그대로 매칭
  const [spotifyRaw, youtubeRaw] = await Promise.all([
    searchSpotifyTrack(title, artistId),
    searchYoutubeVideo(title, artistId),
  ]);

  return {
    titleJa: null,
    titleLatin: null,
    spotifyTracks: spotifyRaw,
    youtubeVideos: youtubeRaw,
  };
}

async function searchTopicChannelTopTitle(
  tjTitle: string,
  artistId: number,
): Promise<string | null> {
  const topicChannelId = await getArtistYoutubeTopicChannel(artistId);

  if (!topicChannelId) {
    return null;
  }

  const response = await searchYoutubeVideos(tjTitle, {
    channelId: topicChannelId,
    maxResults: 1,
  });

  return normalizeNullable(response.items[0]?.snippet?.title);
}

async function getArtistYoutubeTopicChannel(
  artistId: number,
): Promise<string | null> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
  });

  try {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: { youtube_topic_channel: true },
    });

    return normalizeNullable(artist?.youtube_topic_channel);
  } finally {
    await prisma.$disconnect();
  }
}

async function findLatinTitleFromMusicBrainz(
  spotifyMatches: SpotifyTrackMatch[],
): Promise<string | null> {
  const isrcs = Array.from(
    new Set(
      [...spotifyMatches]
        .sort((a, b) => Number(b.isBestMatch) - Number(a.isBestMatch))
        .map((match) => match.isrc)
        .filter((isrc): isrc is string => Boolean(isrc)),
    ),
  );

  if (isrcs.length === 0) {
    return null;
  }

  const client = new Client({ connectionString: getMediaDatabaseUrl() });
  await client.connect();

  let rows: Array<{ isrc: string; title: string | null }>;
  try {
    const result = await client.query<{ isrc: string; title: string | null }>(
      `select isrc, title from musicbrainz where isrc = any($1::text[])`,
      [isrcs],
    );
    rows = result.rows;
  } finally {
    await client.end();
  }

  const titleByIsrc = new Map(rows.map((row) => [row.isrc, row.title]));

  for (const isrc of isrcs) {
    const title = normalizeNullable(titleByIsrc.get(isrc));
    if (title && hasLatinOnly(title)) {
      return title;
    }
  }

  return null;
}

function mergeById<T extends { id: string; isBestMatch: boolean }>(
  ...lists: T[][]
): T[] {
  const byId = new Map<string, T>();

  for (const list of lists) {
    for (const item of list) {
      const existing = byId.get(item.id);
      if (!existing || (item.isBestMatch && !existing.isBestMatch)) {
        byId.set(item.id, item);
      }
    }
  }

  return Array.from(byId.values());
}

function emptyResult(): SearchSongMediaResult {
  return { titleJa: null, titleLatin: null, spotifyTracks: [], youtubeVideos: [] };
}

function hasJapanese(value: string): boolean {
  return /[぀-ヿ一-龯]/.test(value);
}

function hasLatinOnly(value: string): boolean {
  return /^[a-zA-Z0-9\s&._'-]+$/.test(value);
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
