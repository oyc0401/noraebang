import { getYoutubeKeyManager } from "./keys/index.ts";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const MUSIC_CATEGORY_ID = "10";

export interface YoutubeSearchResponse {
  items: Array<{
    id?: { channelId?: string };
    snippet?: Record<string, unknown>;
  }>;
}

export interface YoutubeVideoSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, unknown>;
  };
}

export interface YoutubeVideoSearchResponse {
  items: YoutubeVideoSearchItem[];
  nextPageToken?: string;
}

export interface YoutubeVideoSearchOptions {
  maxResults?: number;
  order?: "date" | "rating" | "relevance" | "title" | "viewCount";
  regionCode?: string;
  relevanceLanguage?: string;
  filterToMusicCategory?: boolean;
}

export async function searchYoutubeChannels(
  query: string,
  maxResults = 5,
): Promise<YoutubeSearchResponse> {
  if (!query.trim()) {
    throw new Error("검색어를 입력해주세요.");
  }

  const keyManager = await getYoutubeKeyManager();
  return keyManager.reuseWithRetry(async (apiKey) => {
    const url = new URL(`${YOUTUBE_API_BASE}/search`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "channel");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(maxResults));

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(
        `YouTube search request failed (status ${response.status})`,
      );
    }
    return (await response.json()) as YoutubeSearchResponse;
  });
}

export async function searchYoutubeVideos(
  query: string,
  options: YoutubeVideoSearchOptions = {},
): Promise<YoutubeVideoSearchResponse> {
  if (!query.trim()) {
    throw new Error("검색어를 입력해주세요.");
  }

  const {
    maxResults = 5,
    order = "relevance",
    regionCode,
    relevanceLanguage,
    filterToMusicCategory = true,
  } = options;

  const clampedResults = Math.min(Math.max(maxResults, 1), 50);

  const keyManager = await getYoutubeKeyManager();
  return keyManager.reuseWithRetry(async (apiKey) => {
    const url = new URL(`${YOUTUBE_API_BASE}/search`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(clampedResults));
    url.searchParams.set("order", order);
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("videoSyndicated", "true");

    if (filterToMusicCategory) {
      url.searchParams.set("videoCategoryId", MUSIC_CATEGORY_ID);
    }

    if (regionCode) {
      url.searchParams.set("regionCode", regionCode);
    }

    if (relevanceLanguage) {
      url.searchParams.set("relevanceLanguage", relevanceLanguage);
    }

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(
        `YouTube video search request failed (status ${response.status})`,
      );
    }
    return (await response.json()) as YoutubeVideoSearchResponse;
  });
}
