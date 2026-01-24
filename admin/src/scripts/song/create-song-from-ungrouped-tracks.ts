/**
 * 아티스트의 미그룹 SpotifyTrack과 YoutubeVideo를 매칭하여 Song 생성
 *
 * 동작:
 * 1. 미그룹 SpotifyTrack들(groupId === null)을 인기도 내림차순으로 조회
 * 2. 아티스트의 토픽 채널 YoutubeVideo들 중 Song에 연결되지 않은 것 조회
 * 3. findBestMatch(track, videos)로 매칭되는 쌍 찾기
 * 4. 매칭된 경우 + 기존 Song에 없는 경우 → Song 생성 + 트랙/비디오 연결
 * 5. 생성된 Song에 대해 inst, remix 등 관련 버전도 연결
 *
 * 특징:
 * - 인기도 높은 곡부터 처리하므로 "A"가 먼저 처리되고 "A inst"는 스킵됨
 * - normalizeTitle로 정규화하여 중복 Song 생성 방지
 *
 * 사용법:
 * pnpm ts-node src/scripts/song/create-song-from-ungrouped-tracks.ts <artistId>
 * pnpm ts-node src/scripts/song/create-song-from-ungrouped-tracks.ts <artistId> --dry-run
 * pnpm ts-node src/scripts/song/create-song-from-ungrouped-tracks.ts 3
 * pnpm ts-node src/scripts/song/create-song-from-ungrouped-tracks.ts 1 100          # 1 ~ 100
 * pnpm ts-node src/scripts/song/create-song-from-ungrouped-tracks.ts 1 100 --dry-run
 */

import "dotenv/config";
import { createSongFromUnmappedTracks } from "../../lib/admin/make-song/create-song-from-spotify-youtube-match";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const numericArgs = args.filter((a) => !a.startsWith("--"));

  if (numericArgs.length === 0) {
    console.error(
      "Usage: pnpm ts-node src/scripts/song/create-song-from-ungrouped-tracks.ts <artistId> [endId] [--dry-run]",
    );
    process.exit(1);
  }

  const startId = Number.parseInt(numericArgs[0], 10);
  const endId = numericArgs[1] ? Number.parseInt(numericArgs[1], 10) : startId;

  if (Number.isNaN(startId) || Number.isNaN(endId)) {
    console.error("Invalid artistId");
    process.exit(1);
  }

  console.log(
    `\n🚀 createSongFromUngroupedTracks: Artist ID ${startId} ~ ${endId}`,
  );
  if (dryRun) console.log("🔍 DRY-RUN MODE\n");

  let totalErrors = 0;

  for (let artistId = startId; artistId <= endId; artistId++) {
    try {
      await createSongFromUnmappedTracks(artistId, { dryRun });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        // Artist not found는 조용히 스킵
        continue;
      }
      console.error(`❌ Artist ${artistId} 처리 실패:`, error);
      totalErrors++;
    }
  }

  console.log("\n==================== [DONE] ====================");
  if (totalErrors > 0) {
    console.log(`❌ Errors: ${totalErrors}`);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
