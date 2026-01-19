import { prisma } from "../prisma";
import {
  fetchYoutubeVideos,
  searchYoutubeVideos,
  type YoutubeVideoSearchItem,
} from "../../thirdparty/youtube";

// searchUnlinkedSongYoutube는 특정 아티스트의 Song 중 YouTube에 연결되지 않은 곡을
// "제목 + 아티스트명" 검색으로 찾아보고, 각 곡별 영상 후보 목록을 반환합니다.

type SongForSearch = {
  id: number;
  title: string;
  titleKo: string | null;
  titleLatin: string | null;
  titleJa: string | null;
};

export interface SearchUnlinkedSongYoutubeOptions {
  maxResultsPerSong?: number;
  maxSongs?: number;
  regionCode?: string;
  relevanceLanguage?: string;
  filterToMusicCategory?: boolean;
}

export type YoutubeVideoCandidate = {
  videoId: string;
  videoName: string;
  channelId?: string;
  channelName?: string;
  publishedAt?: string;
  viewCount: number | null;
};

export type SongYoutubeSearchResult = {
  songId: number;
  songTitle: string;
  videos: YoutubeVideoCandidate[];
};

export type ArtistYoutubeSongSearchResult = {
  artistId: number;
  artistName: string;
  artistNameKo?: string | null;
  songs: SongYoutubeSearchResult[];
};

export async function searchUnlinkedSongYoutube(
  artistId: number,
  options: SearchUnlinkedSongYoutubeOptions = {},
): Promise<ArtistYoutubeSongSearchResult> {
  const {
    maxResultsPerSong = 5,
    maxSongs,
    regionCode,
    relevanceLanguage,
    filterToMusicCategory,
  } = options;

  const perSongLimit = clamp(Math.floor(maxResultsPerSong), 1, 10);
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  const songs = await prisma.song.findMany({
    where: {
      artistSongs: { some: { artistId } },
      youtubeVideoId: null,
      youtubeVideos: { none: {} },
      tjSongId: { not: null },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
    },
    orderBy: { id: "asc" },
  });

  const limitedSongs =
    typeof maxSongs === "number" && maxSongs > 0
      ? songs.slice(0, maxSongs)
      : songs;

  const topicChannels = await prisma.youtubeChannel.findMany({
    where: {
      artistId,
      type: "TOPIC",
    },
    select: {
      channelId: true,
    },
  });
  const topicChannelIds = new Set(
    topicChannels.map((channel) => channel.channelId).filter(Boolean),
  );

  console.log(
    `\n🔎 searchUnlinkedSongYoutube → artistId=${artist.id} (${artist.name})`,
  );
  console.log(
    `  • Unlinked songs: ${songs.length}${
      limitedSongs.length !== songs.length
        ? ` (processing first ${limitedSongs.length})`
        : ""
    }`,
  );

  if (limitedSongs.length === 0) {
    return {
      artistId: artist.id,
      artistName: artist.name,
      artistNameKo: artist.nameKo,
      songs: [],
    };
  }

  const songResults: SongYoutubeSearchResult[] = [];
  const allVideoIds: string[] = [];

  for (const song of limitedSongs) {
    const queryTitle = buildSongSearchTitle(song);
    const query = queryTitle.trim();

    console.log(
      `(${artistId})  → Searching "${song.title}" with query: ${query}`,
    );

    try {
      const videos = await searchSongVideosForChannels({
        query,
        perSongLimit,
        topicChannelIds,
        searchOptions: {
          maxResults: perSongLimit,
          regionCode,
          relevanceLanguage,
          filterToMusicCategory,
        },
      });

      videos.forEach((video) => allVideoIds.push(video.videoId));

      console.log(`     • Candidates found: ${videos.length}`);

      const prioritizedVideos = prioritizeTopicMatches(videos, topicChannelIds);

      songResults.push({
        songId: song.id,
        songTitle: song.title,
        videos: prioritizedVideos.map((video) => ({
          ...video,
          viewCount: null,
        })),
      });
    } catch (error) {
      console.error(
        `     ⚠️ Failed to search YouTube for songId=${song.id}:`,
        error,
      );
      songResults.push({
        songId: song.id,
        songTitle: song.title,
        videos: [],
      });
    }
  }

  if (allVideoIds.length > 0) {
    const viewCountMap = await fetchViewCounts(allVideoIds);
    songResults.forEach((result) => {
      result.videos = result.videos.map((video) => ({
        ...video,
        viewCount: viewCountMap.get(video.videoId) ?? null,
      }));
    });
  }

  return {
    artistId: artist.id,
    artistName: artist.name,
    artistNameKo: artist.nameKo,
    songs: songResults,
  };
}

function buildSongSearchTitle(song: SongForSearch): string {
  return song.title;
}

function extractVideoCandidates(
  items: YoutubeVideoSearchItem[],
): YoutubeVideoCandidate[] {
  return items
    .map((item) => {
      const videoId = item.id?.videoId?.trim();
      if (!videoId) return null;
      const title = item.snippet?.title?.trim();
      const channelId =
        typeof (item.snippet as any)?.channelId === "string"
          ? ((item.snippet as any).channelId as string)
          : undefined;
      const channelName = item.snippet?.channelTitle ?? undefined;
      return {
        videoId,
        videoName: title && title.length > 0 ? title : "(제목 없음)",
        channelId,
        channelName,
        publishedAt: item.snippet?.publishedAt ?? undefined,
      };
    })
    .filter((item): item is Exclude<typeof item, null> => Boolean(item));
}

function prioritizeTopicMatches(
  videos: YoutubeVideoCandidate[],
  topicChannelIds: Set<string>,
): YoutubeVideoCandidate[] {
  if (topicChannelIds.size === 0) return videos;
  const preferred: YoutubeVideoCandidate[] = [];
  const others: YoutubeVideoCandidate[] = [];

  for (const video of videos) {
    if (video.channelId && topicChannelIds.has(video.channelId)) {
      preferred.push(video);
    } else {
      others.push(video);
    }
  }

  return [...preferred, ...others];
}

async function fetchViewCounts(videoIds: string[]) {
  const uniqueIds = Array.from(new Set(videoIds));
  const viewCountMap = new Map<string, number | null>();

  for (const chunk of chunkArray(uniqueIds, 50)) {
    const response = await fetchYoutubeVideos(chunk);
    response.items?.forEach((item) => {
      const raw = item.statistics?.viewCount;
      viewCountMap.set(item.id, parseViewCount(raw));
    });
  }

  return viewCountMap;
}

function parseViewCount(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function chunkArray<T>(input: T[], size: number): T[][] {
  if (size <= 0) return [input];
  const chunks: T[][] = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

async function searchSongVideosForChannels({
  query,
  perSongLimit,
  topicChannelIds,
  searchOptions,
}: {
  query: string;
  perSongLimit: number;
  topicChannelIds: Set<string>;
  searchOptions: SearchUnlinkedSongYoutubeOptions;
}): Promise<YoutubeVideoCandidate[]> {
  const uniqueVideos = new Map<string, YoutubeVideoCandidate>();
  const channelIds = Array.from(topicChannelIds).filter(Boolean);

  const baseOptions = {
    maxResults: perSongLimit,
    regionCode: searchOptions.regionCode,
    relevanceLanguage: searchOptions.relevanceLanguage,
    filterToMusicCategory: searchOptions.filterToMusicCategory,
  };

  if (channelIds.length > 0) {
    for (const channelId of channelIds) {
      const response = await searchYoutubeVideos(query, {
        ...baseOptions,
        channelId,
      });
      const candidates = extractVideoCandidates(response.items);
      for (const video of candidates) {
        if (!uniqueVideos.has(video.videoId)) {
          uniqueVideos.set(video.videoId, video);
        }
      }
      if (uniqueVideos.size >= perSongLimit) break;
    }
  }

  return Array.from(uniqueVideos.values()).slice(0, perSongLimit);
}
