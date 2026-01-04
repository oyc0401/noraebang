import { getYoutubeKeyManager } from "./keys/index.js";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YoutubeChannelResponse {
  items: Array<{
    id: string;
    snippet?: Record<string, unknown>;
    statistics?: Record<string, unknown>;
    brandingSettings?: Record<string, unknown>;
    contentDetails?: Record<string, unknown>;
  }>;
}

type ChannelParams =
  | { channelId: string }
  | { handle?: string; username?: string };

export async function fetchYoutubeChannel(
  params: ChannelParams,
): Promise<YoutubeChannelResponse> {
  const keyManager = await getYoutubeKeyManager();
  return keyManager.reuseWithRetry(async (apiKey) => {
    const url = new URL(`${YOUTUBE_API_BASE}/channels`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set(
      "part",
      "snippet,statistics,brandingSettings,contentDetails",
    );

    if ("channelId" in params) {
      url.searchParams.set("id", params.channelId);
    } else if (params.handle) {
      const handle = params.handle.startsWith("@")
        ? params.handle
        : `@${params.handle}`;
      url.searchParams.set("forHandle", handle);
    } else if (params.username) {
      url.searchParams.set("forUsername", params.username);
    } else {
      throw new Error("channelId, handle, username 중 하나는 필수입니다.");
    }

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(
        `YouTube channels request failed (status ${response.status})`,
      );
    }
    return (await response.json()) as YoutubeChannelResponse;
  });
}
