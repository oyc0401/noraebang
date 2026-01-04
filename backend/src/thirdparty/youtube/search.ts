import { getYoutubeKeyManager } from "./keys/index.js";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YoutubeSearchResponse {
  items: Array<{
    id?: { channelId?: string };
    snippet?: Record<string, unknown>;
  }>;
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
