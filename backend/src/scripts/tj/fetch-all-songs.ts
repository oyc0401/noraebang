import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { TJService } from "../../tj/tj.service";
import { saveSongToDatabase } from "./saveSong";

// 특정 년월부터 현재까지 모든 TJ 노래 크롤링 (기본값: 200101)
// pnpm ts-node src/scripts/tj/fetch-all-songs.ts
// pnpm ts-node src/scripts/tj/fetch-all-songs.ts 202001
// pnpm ts-node src/scripts/tj/fetch-all-songs.ts 202001 --force

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tjService = new TJService();

/**
 * 메인 함수 (특정 년월 ~ 현재까지 모든 월)
 */
async function fetchAllTJSongs(fromYearMonth: string, force: boolean) {
  console.log(
    `🚀 Starting TJ Media ALL songs fetch (${fromYearMonth} ~ now)...\n`,
  );
  if (force) {
    console.log(`⚡ Force mode enabled - will update existing songs\n`);
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalMonths = 0;

  // fetchAllSongs는 제너레이터이므로 for await...of 사용
  for await (const { yearMonth, songs } of tjService.fetchAllSongs(
    fromYearMonth,
  )) {
    totalMonths++;

    if (songs.length === 0) {
      console.log(`⚠️  [${yearMonth}] No songs found`);
      continue;
    }

    console.log(`\n📋 [${yearMonth}] Processing ${songs.length} songs`);

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      console.log(
        `  [${i + 1}/${songs.length}] ${song.karaokeNo} - ${song.title}`,
      );

      try {
        const result = await saveSongToDatabase(song, force, yearMonth);
        if (result === "created") {
          totalCreated++;
        } else if (result === "updated") {
          totalUpdated++;
        } else if (result === "skipped") {
          totalSkipped++;
        }
      } catch (_error) {
        totalErrors++;
      }

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    console.log(`  ✅ [${yearMonth}] Completed`);
    console.log(
      `  📊 Progress: Months ${totalMonths} | Created ${totalCreated} | Updated ${totalUpdated} | Skipped ${totalSkipped} | Errors ${totalErrors}`,
    );
  }

  console.log(`\n✅ Fetch completed!`);
  console.log(`   Total months: ${totalMonths}`);
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
}

// 커맨드 라인 인자에서 fromYearMonth와 --force 플래그 가져오기
const args = process.argv.slice(2);
const fromYearMonth = args.find((arg) => !arg.startsWith("--")) || "200101";
const force = args.includes("--force");

// fromYearMonth 형식 검증 (YYYYMM)
if (fromYearMonth !== "200101" && !/^\d{6}$/.test(fromYearMonth)) {
  console.error(
    "❌ Error: Invalid fromYearMonth format. Expected YYYYMM (e.g., 202001)",
  );
  console.log(
    "Usage: pnpm ts-node src/scripts/tj/fetch-all-songs.ts [fromYearMonth] [--force]",
  );
  process.exit(1);
}

// 스크립트 실행
fetchAllTJSongs(fromYearMonth, force)
  .then(async () => {
    console.log("\n🎉 Done!");
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n💥 Fatal error:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
