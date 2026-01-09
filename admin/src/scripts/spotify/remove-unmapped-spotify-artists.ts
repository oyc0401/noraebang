/**
 * 아티스트에 매핑되지 않은 SpotifyArtist를 제거하는 스크립트
 *
 * 기능:
 * - Artist 테이블에서 참조되지 않는 SpotifyArtist 레코드 조회 및 삭제
 * - SpotifyArtistTrack 매핑도 함께 삭제됨 (cascade)
 * - SpotifyTrack(곡 데이터)은 유지됨
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/remove-unmapped-spotify-artists.ts --dry-run
 * pnpm ts-node src/scripts/spotify/remove-unmapped-spotify-artists.ts
 *
 * 주의:
 * - 삭제된 데이터는 복구 불가능
 * - --dry-run으로 먼저 확인 후 실행 권장
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n=== 매핑되지 않은 SpotifyArtist 제거 ${isDryRun ? "(DRY RUN)" : ""} ===\n`);

  // 1. 모든 SpotifyArtist 조회
  console.log("Step 1: SpotifyArtist 조회 중...");
  const allSpotifyArtists = await prisma.spotifyArtist.findMany({
    select: {
      id: true,
      spotifyId: true,
      name: true,
      popularity: true,
      followers: true,
      _count: {
        select: {
          tracks: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`✓ 총 ${allSpotifyArtists.length}개 SpotifyArtist 발견\n`);

  // 2. Artist에 매핑되지 않은 SpotifyArtist 찾기
  console.log("Step 2: 매핑되지 않은 SpotifyArtist 찾기...");
  const unmappedArtists = [];

  for (const spotifyArtist of allSpotifyArtists) {
    const mappedArtist = await prisma.artist.findFirst({
      where: { spotifyId: spotifyArtist.spotifyId },
      select: { id: true, name: true },
    });

    if (!mappedArtist) {
      unmappedArtists.push(spotifyArtist);
    }
  }

  console.log(`✓ ${unmappedArtists.length}개 매핑되지 않은 SpotifyArtist 발견\n`);

  if (unmappedArtists.length === 0) {
    console.log("✅ 모든 SpotifyArtist가 매핑되어 있습니다!\n");
    return;
  }

  // 3. 삭제 대상 미리보기
  console.log("삭제 대상:");
  console.log("─".repeat(100));
  console.log(
    `${"ID".padEnd(6)} | ${"Spotify ID".padEnd(25)} | ${"Name".padEnd(40)} | ${"Tracks".padEnd(7)} | ${"Followers"}`,
  );
  console.log("─".repeat(100));

  for (const artist of unmappedArtists) {
    const id = artist.id.toString().padEnd(6);
    const spotifyId = artist.spotifyId.padEnd(25);
    const name = (artist.name || "").padEnd(40).substring(0, 40);
    const tracks = artist._count.tracks.toString().padEnd(7);
    const followers = artist.followers?.toLocaleString() || "N/A";

    console.log(`${id} | ${spotifyId} | ${name} | ${tracks} | ${followers}`);
  }
  console.log("─".repeat(100));
  console.log();

  // 4. 통계
  const totalTracks = unmappedArtists.reduce((sum, a) => sum + a._count.tracks, 0);
  console.log("📊 통계:");
  console.log(`  - 삭제할 SpotifyArtist: ${unmappedArtists.length}개`);
  console.log(`  - 삭제될 SpotifyArtistTrack 매핑: ${totalTracks}개`);
  console.log();

  if (isDryRun) {
    console.log("💡 DRY RUN 모드: 실제 삭제는 수행되지 않았습니다.");
    console.log("💡 실제 삭제를 수행하려면 --dry-run 없이 다시 실행하세요.\n");
    return;
  }

  // 5. 삭제 실행
  console.log("Step 3: SpotifyArtist 삭제 중...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const artist of unmappedArtists) {
    try {
      // SpotifyArtist 삭제 (SpotifyArtistTrack은 cascade로 자동 삭제됨)
      await prisma.spotifyArtist.delete({
        where: { id: artist.id },
      });

      console.log(`  ✓ [${artist.id}] ${artist.name} 삭제 완료`);
      successCount++;
    } catch (error: any) {
      console.error(`  ❌ [${artist.id}] ${artist.name} 삭제 실패:`, error.message);
      errorCount++;
    }
  }

  console.log();
  console.log("=== 결과 ===");
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${errorCount}개`);

  if (errorCount === 0) {
    console.log(`\n✅ 모든 매핑되지 않은 SpotifyArtist가 제거되었습니다!`);
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
