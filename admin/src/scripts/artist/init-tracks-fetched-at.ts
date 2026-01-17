/**
 * 아티스트의 트랙 fetch 시간을 초기화하는 스크립트
 *
 * - 아티스트 ID 300 이하: youtubeTracksFetchedAt을 현재 시간으로 설정
 * - 아티스트 ID 300 이하: tjProposeFetchedAt을 현재 시간으로 설정
 * - 아티스트 ID 3739 이하: spotifyTracksFetchedAt을 현재 시간으로 설정
 *
 * pnpm ts-node src/scripts/artist/init-tracks-fetched-at.ts
 * pnpm ts-node src/scripts/artist/init-tracks-fetched-at.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("🔧 아티스트 트랙 fetch 시간 초기화 스크립트");
  if (isDryRun) {
    console.log("🧪 DRY RUN 모드 - 업데이트 없이 대상만 출력합니다.\n");
  } else {
    console.log("⚠️  실제 업데이트가 수행됩니다.\n");
  }

  const now = new Date();

  // 아티스트 ID 300 이하: youtubeTracksFetchedAt, tjProposeFetchedAt 업데이트
  const id300Count = await prisma.artist.count({
    where: { id: { lte: 300 } },
  });
  console.log(`📺 YouTube 대상: 아티스트 ID <= 300 (${id300Count}명)`);
  console.log(`🎤 TJ 신청곡 대상: 아티스트 ID <= 300 (${id300Count}명)`);

  // 아티스트 ID 3739 이하: spotifyTracksFetchedAt 업데이트
  const spotifyTargetCount = await prisma.artist.count({
    where: { id: { lte: 3739 } },
  });
  console.log(`🎵 Spotify 대상: 아티스트 ID <= 3739 (${spotifyTargetCount}명)`);

  if (isDryRun) {
    console.log("\nℹ️  --dry-run 옵션으로 인해 업데이트는 수행되지 않았습니다.");
    return;
  }

  // ID <= 300 업데이트 (YouTube, TJ 신청곡)
  const id300Result = await prisma.artist.updateMany({
    where: { id: { lte: 300 } },
    data: { youtubeTracksFetchedAt: now, tjProposeFetchedAt: now },
  });
  console.log(`\n✅ YouTube + TJ 신청곡 (ID <= 300): ${id300Result.count}명 업데이트 완료`);

  // Spotify 업데이트
  const spotifyResult = await prisma.artist.updateMany({
    where: { id: { lte: 3739 } },
    data: { spotifyTracksFetchedAt: now },
  });
  console.log(`✅ Spotify (ID <= 3739): ${spotifyResult.count}명 업데이트 완료`);

  console.log(`\n🕐 설정된 시간: ${now.toISOString()}`);
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
