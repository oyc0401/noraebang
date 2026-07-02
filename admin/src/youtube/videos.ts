import { getYoutubeKeyManager } from "./keys/index";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_IDS_PER_REQUEST = 50;

export interface YoutubeVideoDetailsResponse {
  items: Array<{
    id: string;
    snippet?: Record<string, unknown>;
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    contentDetails?: {
      duration?: string;
      definition?: string;
      caption?: string;
    };
  }>;
}

export async function fetchYoutubeVideos(
  videoIds: string[],
): Promise<YoutubeVideoDetailsResponse> {
  if (videoIds.length === 0) {
    return { items: [] };
  }

  if (videoIds.length > MAX_IDS_PER_REQUEST) {
    throw new Error(
      `YouTube videos API supports up to ${MAX_IDS_PER_REQUEST} IDs per request`,
    );
  }

  const keyManager = await getYoutubeKeyManager();
  return keyManager.reuseWithRetry(async (apiKey) => {
    const url = new URL(`${YOUTUBE_API_BASE}/videos`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", videoIds.join(","));

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(
        `YouTube videos request failed (status ${response.status})`,
      );
    }

    return (await response.json()) as YoutubeVideoDetailsResponse;
  });
}
