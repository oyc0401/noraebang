/**
 * song.titleJa 값을 titleJaKanji -> titleJaKana 순서로 덮어쓰는 스크립트
 *
 * pnpm --filter admin ts-node src/scripts/song/backfill-title-ja.ts --dry-run
 * pnpm --filter admin ts-node src/scripts/song/backfill-title-ja.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const isDryRun = process.argv.includes("--dry-run");

async function backfillSongTitleJa() {
  console.log(
    "🎵 song.titleJa를 song.titleJaKanji / song.titleJaKana 값으로 덮어씁니다.",
  );

  const targetSongCount = await prisma.song.count({
    where: {
      OR: [
        { titleJaKanji: { not: null } },
        { titleJaKana: { not: null } },
      ],
    },
  });

  if (targetSongCount === 0) {
    console.log("✅ 갱신할 곡이 없습니다.");
    return;
  }

  console.log(`총 ${targetSongCount}곡이 업데이트 대상입니다.`);

  if (isDryRun) {
    console.log("🧪 --dry-run 옵션으로 인해 실제 업데이트는 수행되지 않습니다.");
    return;
  }

  const updatedCount = await prisma.$executeRaw`
    UPDATE "song"
    SET "title_ja" = COALESCE("title_ja_kanji", "title_ja_kana")
    WHERE COALESCE("title_ja_kanji", "title_ja_kana") IS NOT NULL;
  `;

  console.log(`✅ ${updatedCount}곡의 titleJa를 업데이트했습니다.`);
}

backfillSongTitleJa()
  .catch((error) => {
    console.error("❌ 실행 중 오류가 발생했습니다.", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
