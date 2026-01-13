/**
 * JSON 배열을 통해 아티스트의 nameJaKana를 업데이트하는 스크립트
 *
 * 사용법:
 * pnpm ts-node src/scripts/name/update-artist-ja-kana-from-json.ts
 * pnpm ts-node src/scripts/name/update-artist-ja-kana-from-json.ts --dry-run
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

  console.log("======================================");
  console.log("Update Artist nameJaKana from JSON");
  console.log("======================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "PRODUCTION"}\n`);

  // 업데이트할 데이터 배열
  const updates = [
    { id: 15, nameJaKana: "なかしまみか" },
    { id: 21, nameJaKana: "のあ" },
    { id: 26, nameJaKana: "どうむらりう" },
    { id: 35, nameJaKana: "わしおれいな" },
    { id: 42, nameJaKana: "りいぬ" },
    { id: 45, nameJaKana: "りんね" },
    { id: 57, nameJaKana: "もな（CV：なつかわしいな）" },
    { id: 67, nameJaKana: "みやしたゆう" },
    { id: 87, nameJaKana: "さかもとまあや" },
    { id: 106, nameJaKana: "すだまさき" },
    { id: 107, nameJaKana: "すだけいな" },
    { id: 109, nameJaKana: "すうさいど" },
    { id: 132, nameJaKana: "あさこ" },
    { id: 161, nameJaKana: "えいと" },
    { id: 166, nameJaKana: "おりえゆう" },
    { id: 172, nameJaKana: "おふぃしゃるひげだんでぃずむ" },
    { id: 183, nameJaKana: "うただひかる" },
    { id: 186, nameJaKana: "ゆうり" },
    { id: 187, nameJaKana: "ゆううつぼ" },
    { id: 190, nameJaKana: "ゆうか" },
    { id: 199, nameJaKana: "いっせい" },
    { id: 215, nameJaKana: "かわさきたかや" },
    { id: 216, nameJaKana: "かふ" },
    { id: 228, nameJaKana: "きただにりゅうき" },
    { id: 229, nameJaKana: "きとうあかり" },
    { id: 234, nameJaKana: "たかせとうや" },
    { id: 237, nameJaKana: "てしまあおい" },
    { id: 260, nameJaKana: "はたもとひろ" },
    { id: 263, nameJaKana: "ほしのげん" },
    { id: 264, nameJaKana: "ふなつまなと" },
    { id: 265, nameJaKana: "ふじいかぜ" },
  ];

  console.log(`Target artist count: ${updates.length}\n`);

  let updatedCount = 0;

  for (const update of updates) {
    const artist = await prisma.artist.findUnique({
      where: { id: update.id },
      select: {
        id: true,
        nameKo: true,
        nameJaKana: true,
      },
    });

    if (!artist) {
      console.log(`[${update.id}] Artist not found`);
      continue;
    }

    console.log(
      `[${update.id}] ${artist.nameKo} - nameJaKana: ${artist.nameJaKana} → ${update.nameJaKana}`,
    );

    if (!isDryRun) {
      await prisma.artist.update({
        where: { id: update.id },
        data: { nameJaKana: update.nameJaKana },
      });
    }

    updatedCount++;
  }

  console.log("\n======================================");
  console.log("Summary");
  console.log("======================================");
  console.log(`Total artists: ${updates.length}`);
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
