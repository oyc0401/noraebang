/**
 * artist.nameJa 값을 nameJaKanji -> nameJaKana 순서로 덮어쓰는 스크립트
 *
 * pnpm --filter admin ts-node src/scripts/artist/backfill-name-ja.ts --dry-run
 * pnpm --filter admin ts-node src/scripts/artist/backfill-name-ja.ts
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
  console.log(
    "🎤 artist.nameJa를 nameJaKanji / nameJaKana 값으로 덮어씁니다.",
  );

  const targetCount = await prisma.artist.count({
    where: {
      OR: [
        { nameJaKanji: { not: null } },
        { nameJaKana: { not: null } },
      ],
    },
  });

  if (targetCount === 0) {
    console.log("✅ 갱신할 아티스트가 없습니다.");
    return;
  }

  console.log(`총 ${targetCount}명의 아티스트가 업데이트 대상입니다.`);

  if (isDryRun) {
    console.log("🧪 --dry-run 옵션으로 인해 실제 업데이트는 수행되지 않습니다.");
    return;
  }

  const updatedCount = await prisma.$executeRaw`
    UPDATE "artist"
    SET "name_ja" = COALESCE("name_ja_kanji", "name_ja_kana")
    WHERE COALESCE("name_ja_kanji", "name_ja_kana") IS NOT NULL;
  `;

  console.log(`✅ ${updatedCount}명의 artist.nameJa를 업데이트했습니다.`);
}

main()
  .catch((error) => {
    console.error("❌ 실행 중 오류가 발생했습니다.", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
