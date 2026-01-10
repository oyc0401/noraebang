import "dotenv/config";

// 사용법:
// pnpm ts-node src/scripts/youtube/fetch-video-info.ts

// 설명:
// YouTube Data API v3를 사용해 특정 영상의 메타데이터(snippet, contentDetails, statistics, status)를 조회하고
// 응답 Raw(JSON)까지 바로 출력하는 스크립트입니다. 스크립트 내부에 정의된 VIDEO_ID 상수를 원하는 영상으로 수정하면 다른 영상도 조회할 수 있습니다.

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  throw new Error("YOUTUBE_API_KEY is not set");
}

const VIDEO_ID = "6OC92oxs4gA";
const TARGET_LOCALE = "ko";

interface YoutubeVideoApiResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      description?: string;
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
  [key: string]: unknown;
}

interface FetchResult {
  raw: string;
  data: YoutubeVideoApiResponse;
}

async function fetchVideoDetails(videoId: string): Promise<FetchResult> {
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("key", YOUTUBE_API_KEY!);
  endpoint.searchParams.set("id", videoId);
  endpoint.searchParams.set("part", "snippet,contentDetails,statistics,status");
  endpoint.searchParams.set("hl", TARGET_LOCALE);

  const response = await fetch(endpoint);
  const raw = await response.text();

  if (!response.ok) {
    throw new Error(
      `YouTube API error: ${response.status} ${response.statusText} - ${raw}`,
    );
  }

  const data = JSON.parse(raw) as YoutubeVideoApiResponse;
  return { raw, data };
}

async function main() {
  console.log(`🎬 Target video ID: ${VIDEO_ID}`);

  const { raw, data } = await fetchVideoDetails(VIDEO_ID);

  console.log("\n📄 Raw response from YouTube Data API:");
  console.log(raw);

  if (!data.items || data.items.length === 0) {
    console.warn("\n❗ No video data returned. Please confirm the video ID.");
    return;
  }

  const video = data.items[0];
  console.log("\n📝 Parsed summary:");
  console.log(` - Title: ${video.snippet?.title ?? "N/A"}`);
  console.log(` - Channel: ${video.snippet?.channelTitle ?? "N/A"}`);
  console.log(` - Published: ${video.snippet?.publishedAt ?? "N/A"}`);
  console.log(` - Views: ${video.statistics?.viewCount ?? "N/A"}`);
  console.log(` - Likes: ${video.statistics?.likeCount ?? "N/A"}`);
  console.log(` - Comments: ${video.statistics?.commentCount ?? "N/A"}`);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
