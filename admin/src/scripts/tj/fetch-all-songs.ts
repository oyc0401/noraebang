import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { TJService, type TJSongData } from "./tj.service";
import { saveSongToDatabase } from "./saveSong";

// 특정 년월부터 현재까지 모든 TJ 노래 크롤링 (기본값: 200101)
// pnpm ts-node src/scripts/tj/fetch-all-songs.ts
// pnpm ts-node src/scripts/tj/fetch-all-songs.ts 202001
// pnpm ts-node src/scripts/tj/fetch-all-songs.ts 202001 --force

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tjService = new TJService();
const SONG_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.TJ_SONG_CONCURRENCY ?? "10", 10),
);

type FetchTotals = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

async function processSongWithStats(
  song: TJSongData,
  index: number,
  total: number,
  force: boolean,
  totals: FetchTotals,
): Promise<void> {
  console.log(
    `  [${index + 1}/${total}] ${song.karaokeNo} - ${song.title}`,
  );

  try {
    const result = await saveSongToDatabase(song, force);
    if (result === "created") {
      totals.created++;
    } else if (result === "updated") {
      totals.updated++;
    } else if (result === "skipped") {
      totals.skipped++;
    }
  } catch (_error) {
    totals.errors++;
  }
}

async function processSongsConcurrently(
  songs: TJSongData[],
  force: boolean,
  totals: FetchTotals,
): Promise<void> {
  for (let start = 0; start < songs.length; start += SONG_CONCURRENCY) {
    const batch = songs.slice(start, start + SONG_CONCURRENCY);
    await Promise.allSettled(
      batch.map((song, offset) =>
        processSongWithStats(
          song,
          start + offset,
          songs.length,
          force,
          totals,
        ),
      ),
    );
  }
}

/**
 * 메인 함수 (특정 년월 ~ 현재까지 모든 월)
 */
async function fetchAllTJSongs(fromYearMonth: string, force: boolean) {
  const totals: FetchTotals = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };
  console.log(
    `🚀 Starting TJ Media ALL songs fetch (${fromYearMonth} ~ now)...\n`,
  );
  if (force) {
    console.log(`⚡ Force mode enabled - will update existing songs\n`);
  }

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

    await processSongsConcurrently(songs, force, totals);

    console.log(`  ✅ [${yearMonth}] Completed`);
    console.log(
      `  📊 Progress: Months ${totalMonths} | Created ${totals.created} | Updated ${totals.updated} | Skipped ${totals.skipped} | Errors ${totals.errors}`,
    );
  }

  console.log(`\n✅ Fetch completed!`);
  console.log(`   Total months: ${totalMonths}`);
  console.log(`   Created: ${totals.created}`);
  console.log(`   Updated: ${totals.updated}`);
  console.log(`   Skipped: ${totals.skipped}`);
  console.log(`   Errors: ${totals.errors}`);
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
    "Usage: pnpm ts-node scripts/tj/fetch-all-songs.ts [fromYearMonth] [--force]",
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
