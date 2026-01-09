/**
 * 중복 스포티파이 트랙을 비활성화하는 스크립트
 *
 * 기능:
 * - SpotifyTrack 테이블의 모든 트랙 조회
 * - 제목 패턴을 분석하여 중복 트랙 감지
 * - 중복 트랙의 disabled를 true로 설정
 *
 * 중복으로 판단하는 패턴:
 * - (alt ver.), (Ver.), (Version) 등 버전 표시
 * - - Live, (Live), - Live at 등 라이브 버전
 * - - Instrumental, (Instrumental), - Inst. 등 인스트루멘탈
 * - - Remix, (Remix), - XX Remix 등 리믹스
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/disable-duplicate-tracks.ts --dry-run
 * pnpm ts-node src/scripts/spotify/disable-duplicate-tracks.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { isDuplicateTrack } from "../../lib/duplicate-track-detector.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    `\n=== 중복 스포티파이 트랙 비활성화 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1. 모든 SpotifyTrack 조회
  console.log("Step 1: 모든 SpotifyTrack 조회 중...");
  const allTracks = await prisma.spotifyTrack.findMany({
    select: {
      id: true,
      spotifyId: true,
      name: true,
      disabled: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`✓ 총 ${allTracks.length}개의 트랙을 찾았습니다.\n`);

  // 2. 중복 트랙 감지
  console.log("Step 2: 중복 트랙 감지 중...");
  const duplicateTracks = allTracks.filter((track) =>
    isDuplicateTrack(track.name),
  );

  console.log(`✓ ${duplicateTracks.length}개의 중복 트랙을 감지했습니다.\n`);

  // 3. 통계 출력
  const alreadyDisabled = duplicateTracks.filter((t) => t.disabled).length;
  const toDisable = duplicateTracks.filter((t) => !t.disabled).length;

  console.log("=== 통계 ===");
  console.log(`📊 전체 트랙: ${allTracks.length}개`);
  console.log(`🔍 중복 트랙: ${duplicateTracks.length}개`);
  console.log(`  - 이미 비활성화됨: ${alreadyDisabled}개`);
  console.log(`  - 비활성화 필요: ${toDisable}개\n`);

  if (toDisable === 0) {
    console.log("✅ 비활성화할 트랙이 없습니다.");
    return;
  }

  // 4. 샘플 출력 (처음 10개)
  console.log("=== 비활성화할 트랙 샘플 (최대 10개) ===");
  duplicateTracks
    .filter((t) => !t.disabled)
    .slice(0, 10)
    .forEach((track, index) => {
      console.log(`${index + 1}. [${track.id}] ${track.name}`);
    });
  console.log();

  // 5. 비활성화 실행
  if (!isDryRun) {
    console.log("Step 3: 중복 트랙 비활성화 중...");

    const trackIdsToDisable = duplicateTracks
      .filter((t) => !t.disabled)
      .map((t) => t.id);

    const result = await prisma.spotifyTrack.updateMany({
      where: {
        id: {
          in: trackIdsToDisable,
        },
      },
      data: {
        disabled: true,
      },
    });

    console.log(`✓ ${result.count}개의 트랙을 비활성화했습니다.\n`);
  }

  // 6. 결과 출력
  console.log("=== 결과 ===");
  if (isDryRun) {
    console.log(
      `💡 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`,
    );
  } else {
    console.log(`✅ ${toDisable}개의 중복 트랙을 비활성화했습니다!`);
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
