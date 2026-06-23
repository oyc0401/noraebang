/**
 * searchSongMedia(tjTitle, artistId) 동작 확인용 수동 테스트.
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/collection/song-creation-queue/test-search-song-media.ts
 *
 * tjTitle, artistId 값을 바꿔가며 실행.
 */
import "dotenv/config";
import { searchSongMedia } from "./index";

const tjTitle = "マリーゴールド";
const artistId = 140; // 실제 artist.id로 교체

async function main() {
  const result = await searchSongMedia(tjTitle, artistId);

  console.log(
    JSON.stringify(
      {
        tjTitle,
        artistId,
        titleJa: result.titleJa,
        titleLatin: result.titleLatin,
        spotifyTracks: result.spotifyTracks,
        youtubeVideos: result.youtubeVideos,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
