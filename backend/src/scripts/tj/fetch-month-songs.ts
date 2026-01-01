import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { TJService } from "../../tj/tj.service";
import { saveSongToDatabase } from "./saveSong";

// 특정 월의 TJ 노래 크롤링 (YYYYMM 형식)
// pnpm ts-node src/scripts/tj/fetch-month-songs.ts 202512
// pnpm ts-node src/scripts/tj/fetch-month-songs.ts 202512 --force

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tjService = new TJService();

/**
 * 메인 함수
 */
async function fetchMonthTJSongs(yearMonth: string, force: boolean) {
  console.log(`🚀 Starting TJ Media songs fetch for ${yearMonth}...\n`);
  if (force) {
    console.log(`⚡ Force mode enabled - will update existing songs\n`);
  }

  // 1. 해당 월의 곡 정보 가져오기
  const songs = await tjService.fetchSongsByMonth(yearMonth);

  if (songs.length === 0) {
    console.log(`⚠️  No songs found for ${yearMonth}`);
    return;
  }

  console.log(`\n📋 Processing ${songs.length} songs from ${yearMonth}\n`);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 2. TjSong 테이블에 저장
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    console.log(`[${i + 1}/${songs.length}] ${song.karaokeNo} - ${song.title}`);

    try {
      const result = await saveSongToDatabase(song, force, yearMonth);
      if (result === "created") {
        totalCreated++;
      } else if (result === "updated") {
        totalUpdated++;
      } else if (result === "skipped") {
        totalSkipped++;
      }
    } catch (error) {
      totalErrors++;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  console.log(`\n✅ Fetch completed!`);
  console.log(`   Total songs: ${songs.length}`);
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
}

// 커맨드 라인 인자에서 yearMonth와 --force 플래그 가져오기
const args = process.argv.slice(2);
const yearMonth = args.find((arg) => !arg.startsWith("--"));
const force = args.includes("--force");

if (!yearMonth) {
  console.error("❌ Error: Please provide yearMonth (e.g., 202512)");
  console.log(
    "Usage: pnpm ts-node src/scripts/tj/fetch-month-songs.ts 202512 [--force]",
  );
  process.exit(1);
}

// yearMonth 형식 검증 (YYYYMM)
if (!/^\d{6}$/.test(yearMonth)) {
  console.error(
    "❌ Error: Invalid yearMonth format. Expected YYYYMM (e.g., 202512)",
  );
  process.exit(1);
}

// 스크립트 실행
fetchMonthTJSongs(yearMonth, force)
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
