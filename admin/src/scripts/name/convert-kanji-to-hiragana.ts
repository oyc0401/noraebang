/**
 * nameJaKanji를 kuroshiro로 히라가나로 변환해서 nameJaKana에 저장하는 스크립트
 *
 * 사용법:
 * pnpm ts-node src/scripts/name/convert-kanji-to-hiragana.ts
 * pnpm ts-node src/scripts/name/convert-kanji-to-hiragana.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
// @ts-ignore
import Kuroshiro from "kuroshiro";
// @ts-ignore
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("======================================");
  console.log("Convert Kanji to Hiragana Script");
  console.log("======================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "PRODUCTION"}\n`);

  // kuroshiro 초기화
  console.log("🔧 Initializing kuroshiro...");
  const kuroshiro = new Kuroshiro.default();
  await kuroshiro.init(new KuromojiAnalyzer());
  console.log("✓ Kuroshiro initialized\n");

  // 변환할 아티스트 ID 배열
  const artistIds = [
    2, 3, 4, 14, 15, 16, 21, 22, 26, 35, 42, 45, 49, 51, 57, 59, 60, 62, 67, 68,
    72, 81, 84, 87, 89, 90, 95, 100, 105, 106, 107, 109, 110, 116, 117, 120,
    121, 124, 127, 129, 132, 144, 146, 152, 161, 164, 166, 169, 170, 171, 172,
    173, 176, 182, 183, 186, 187, 190, 192, 195, 197, 199, 205, 209, 214, 215,
    216, 221, 225, 228, 229, 232, 234, 235, 236, 237, 242, 244, 246, 253, 255,
    256, 257, 258, 259, 260, 263, 264, 265, 266, 267, 268, 269, 271, 272,
  ];

  console.log(`Target artist count: ${artistIds.length}\n`);

  let updatedCount = 0;

  for (const artistId of artistIds) {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        nameKo: true,
        nameJaKanji: true,
        nameJaKana: true,
      },
    });

    if (!artist) {
      console.log(`[${artistId}] Artist not found`);
      continue;
    }

    if (!artist.nameJaKanji) {
      console.log(`[${artistId}] ${artist.nameKo} - No nameJaKanji, skipped`);
      continue;
    }

    const hiragana = await kuroshiro.convert(artist.nameJaKanji, {
      to: "hiragana",
    });

    console.log(
      `[${artistId}] ${artist.nameKo} - ${artist.nameJaKanji} → ${hiragana}`,
    );

    if (!isDryRun) {
      await prisma.artist.update({
        where: { id: artistId },
        data: { nameJaKana: hiragana },
      });
    }

    updatedCount++;
  }

  console.log("\n======================================");
  console.log("Summary");
  console.log("======================================");
  console.log(`Total artists: ${artistIds.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log("======================================");

  if (isDryRun) {
    console.log("\n⚠️  DRY RUN - No changes were made to the database");
  } else {
    console.log("\n✓ All done!");
  }
}

main()
  .catch((error) => {
    console.error("\n✗ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
