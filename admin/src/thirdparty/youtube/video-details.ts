import { getYoutubeKeyManager } from "./keys/index.ts";

/**
 * YouTube Video의 세부 정보(statistics, contentDetails)를 가져오는 함수
 * videos API 사용 - duration, viewCount 등 포함
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface VideoDetails {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSeconds?: number;
  definition?: string;
  caption?: boolean;
}

// ISO 8601 duration을 초로 변환 (예: PT4M13S -> 253)
function parseDuration(duration?: string): number | undefined {
  if (!duration) return undefined;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchVideoDetails(
  videoIds: string[],
): Promise<Map<string, VideoDetails>> {
  if (videoIds.length === 0) {
    return new Map();
  }

  const keyManager = getYoutubeKeyManager();
  const result = new Map<string, VideoDetails>();

  // 50개씩 배치 처리
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    const data = await keyManager.reuseWithRetry(async (apiKey) => {
      const url = new URL(`${YOUTUBE_API_BASE}/videos`);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("part", "statistics,contentDetails");
      url.searchParams.set("id", batch.join(","));

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(
          json.error?.message ||
            `YouTube videos request failed (status ${response.status})`,
        );
      }

      return await response.json();
    });

    const items = Array.isArray(data.items) ? data.items : [];

    for (const item of items) {
      const stats = item.statistics;
      const content = item.contentDetails;

      result.set(item.id, {
        viewCount: stats?.viewCount ? parseInt(stats.viewCount, 10) : undefined,
        likeCount: stats?.likeCount ? parseInt(stats.likeCount, 10) : undefined,
        commentCount: stats?.commentCount
          ? parseInt(stats.commentCount, 10)
          : undefined,
        durationSeconds: parseDuration(content?.duration),
        definition: content?.definition,
        caption: content?.caption === "true",
      });
    }

    // Rate limit 방지
    if (i + 50 < videoIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return result;
}
