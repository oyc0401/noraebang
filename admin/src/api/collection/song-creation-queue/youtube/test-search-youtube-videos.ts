/**
 * searchYoutubeVideos(곡제목, { channelId }) 동작 확인용 수동 테스트.
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/collection/song-creation-queue/youtube/test-search-youtube-videos.ts
 *
 * songTitle, channelId 값을 바꿔가며 실행.
 */
import "dotenv/config";
import { searchYoutubeVideos } from "../../../../youtube";

const songTitle = "マリーゴールド";
const channelId = "UCQG5sjqWWe4MRhYM_OAEIyw"; // 토픽채널 ID로 교체

async function main() {
  const response = await searchYoutubeVideos(songTitle, {
    channelId,
    maxResults: 5,
  });

  const items = response.items.map((item) => ({
    videoId: item.id?.videoId,
    title: item.snippet?.title,
    channelTitle: item.snippet?.channelTitle,
    publishedAt: item.snippet?.publishedAt,
  }));

  console.log(JSON.stringify({ songTitle, channelId, items }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
