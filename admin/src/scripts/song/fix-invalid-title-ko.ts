/**
 * 잘못된 titleKo 값을 제거하는 스크립트
 * - titleKo에 한글이 없는 경우 null로 설정
 *
 * pnpm --filter admin ts-node src/scripts/song/fix-invalid-title-ko.ts --dry-run
 * pnpm --filter admin ts-node src/scripts/song/fix-invalid-title-ko.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const isDryRun = process.argv.includes("--dry-run");

const hasKorean = (text: string) => /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);

async function fixInvalidTitleKo() {
  console.log("🔍 한글이 없는 titleKo 값을 찾아서 제거합니다.\n");

  const songsWithTitleKo = await prisma.song.findMany({
    where: {
      titleKo: { not: null },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
    },
  });

  console.log(`총 ${songsWithTitleKo.length}곡에 titleKo가 있습니다.`);

  const invalidSongs = songsWithTitleKo.filter(
    (song) => song.titleKo && !hasKorean(song.titleKo),
  );

  if (invalidSongs.length === 0) {
    console.log("✅ 잘못된 titleKo가 없습니다.");
    return;
  }

  console.log(`\n❌ 한글이 없는 titleKo: ${invalidSongs.length}개\n`);

  for (const song of invalidSongs) {
    console.log(`  [Song #${song.id}] title="${song.title}" titleKo="${song.titleKo}"`);
  }

  if (isDryRun) {
    console.log("\n🧪 --dry-run 옵션으로 인해 실제 업데이트는 수행되지 않습니다.");
    return;
  }

  console.log("\n🔧 titleKo를 null로 설정합니다...");

  const invalidIds = invalidSongs.map((s) => s.id);
  const updatedCount = await prisma.song.updateMany({
    where: { id: { in: invalidIds } },
    data: { titleKo: null },
  });

  console.log(`✅ ${updatedCount.count}곡의 titleKo를 제거했습니다.`);
}

fixInvalidTitleKo()
  .catch((error) => {
    console.error("❌ 실행 중 오류가 발생했습니다.", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
