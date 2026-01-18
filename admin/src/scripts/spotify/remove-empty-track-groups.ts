/**
 * 트랙이 1개도 없는 SpotifyTrackGroup을 삭제하는 스크립트
 *
 * 기능:
 * - tracks 관계가 비어 있는 SpotifyTrackGroup 조회
 * - 연결된 Song이 있으면 개수를 출력 (삭제 시 참조는 자동으로 null 처리됨)
 * - dry-run 모드 지원
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/remove-empty-track-groups.ts
 * pnpm ts-node src/scripts/spotify/remove-empty-track-groups.ts --dry-run
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
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE] 실제 DB 삭제는 수행하지 않습니다.\n");
  }

  console.log("📊 트랙이 없는 SpotifyTrackGroup을 검색합니다...\n");

  const emptyGroups = await prisma.spotifyTrackGroup.findMany({
    where: {
      tracks: {
        none: {},
      },
    },
    select: {
      id: true,
      createdAt: true,
      songs: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  if (emptyGroups.length === 0) {
    console.log("✅ 삭제할 그룹이 없습니다.");
    return;
  }

  console.log(`✅ 트랙이 없는 그룹: ${emptyGroups.length}개 발견\n`);

  let deletedCount = 0;

  for (let i = 0; i < emptyGroups.length; i++) {
    const group = emptyGroups[i];
    const progress = `[${i + 1}/${emptyGroups.length}]`;

    console.log(`${progress} 그룹 ID: ${group.id}`);
    console.log(`     생성일: ${group.createdAt.toISOString()}`);
    console.log(`     연결된 Song 수: ${group.songs.length}`);
    if (group.songs.length > 0) {
      group.songs.slice(0, 5).forEach((song) => {
        console.log(`       - Song ID ${song.id}: ${song.title}`);
      });
      if (group.songs.length > 5) {
        console.log(`       ... 외 ${group.songs.length - 5}개`);
      }
    }

    if (isDryRun) {
      console.log("     🔍 [DRY RUN] 삭제 예정\n");
      deletedCount++;
      continue;
    }

    await prisma.spotifyTrackGroup.delete({
      where: {
        id: group.id,
      },
    });

    console.log("     ✅ 삭제 완료\n");
    deletedCount++;
  }

  console.log(`${"=".repeat(50)}`);
  console.log("📊 실행 결과");
  console.log(`  🗑️  삭제된 그룹: ${deletedCount}`);
  console.log(`${"=".repeat(50)}\n`);
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
