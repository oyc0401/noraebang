/**
 * SpotifyTrackGroup 전체 삭제
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/delete-all-track-groups.ts --dry-run
 * pnpm ts-node src/scripts/spotify/delete-all-track-groups.ts
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

  console.log("🗑️  SpotifyTrackGroup 전체 삭제");
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE\n");
  }

  // 현재 상태 확인
  const totalGroups = await prisma.spotifyTrackGroup.count();
  const groupsWithSong = await prisma.spotifyTrackGroup.count({
    where: { songId: { not: null } }
  });

  console.log(`📊 현재 상태:`);
  console.log(`  - 전체 TrackGroup: ${totalGroups}개`);
  console.log(`  - Song 연결된 Group: ${groupsWithSong}개\n`);

  if (totalGroups === 0) {
    console.log("✅ 삭제할 TrackGroup이 없습니다.");
    return;
  }

  if (isDryRun) {
    console.log("💡 DRY RUN: 실제 삭제는 수행하지 않습니다.");
    console.log(`\n--dry-run 없이 실행하면 ${totalGroups}개의 TrackGroup이 삭제됩니다.`);
    console.log("(SpotifyTrack.groupId는 자동으로 null이 됩니다)");
    return;
  }

  console.log("⚠️  삭제 시작...");

  const result = await prisma.spotifyTrackGroup.deleteMany({});

  console.log(`✅ 완료: ${result.count}개의 TrackGroup 삭제됨\n`);
  console.log("다음 단계:");
  console.log("  pnpm ts-node src/scripts/spotify/group-duplicate-spotify-tracks.ts");
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
