/**
 * JPOP 아티스트의 모든 곡을 visible = true로 설정하는 스크립트
 *
 * pnpm ts-node src/scripts/artist/set-jpop-songs-visible.ts --dry-run
 * pnpm ts-node src/scripts/artist/set-jpop-songs-visible.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 DRY RUN 모드\n");
  }

  // JPOP 아티스트의 곡 ID 조회
  const jpopSongs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: {
          artist: {
            homeCatalog: "JPOP",
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      visible: true,
    },
  });

  const alreadyVisible = jpopSongs.filter((s) => s.visible);
  const toUpdate = jpopSongs.filter((s) => !s.visible);

  console.log(`🎵 JPOP 아티스트 곡 수: ${jpopSongs.length}개`);
  console.log(`  - 이미 visible: ${alreadyVisible.length}개`);
  console.log(`  - 업데이트 대상: ${toUpdate.length}개\n`);

  if (toUpdate.length === 0) {
    console.log("✅ 업데이트할 곡이 없습니다.");
    return;
  }

  if (isDryRun) {
    console.log("📋 업데이트 대상 샘플 (처음 10개):");
    toUpdate.slice(0, 10).forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.id}] ${s.title}`);
    });
    if (toUpdate.length > 10) {
      console.log(`  ... 외 ${toUpdate.length - 10}개`);
    }
    console.log("\n⚠️  실제 적용하려면 --dry-run 옵션을 제거하세요.");
    return;
  }

  // 일괄 업데이트
  const result = await prisma.song.updateMany({
    where: {
      id: { in: toUpdate.map((s) => s.id) },
    },
    data: {
      visible: true,
    },
  });

  console.log(`✅ ${result.count}개 곡을 visible = true로 업데이트했습니다.`);
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
