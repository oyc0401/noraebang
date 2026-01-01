import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TJService } from '../../tj/tj.service';
import { saveSongToDatabase } from './saveSong';

// 2001년 1월부터 현재까지 모든 TJ 노래 크롤링
// pnpm ts-node src/scripts/tj/fetch-all-songs.ts
// pnpm ts-node src/scripts/tj/fetch-all-songs.ts --force

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tjService = new TJService();

/**
 * 메인 함수 (2001년 1월 ~ 현재까지 모든 월)
 */
async function fetchAllTJSongs(force: boolean) {
  console.log('🚀 Starting TJ Media ALL songs fetch (2001.01 ~ now)...\n');
  if (force) {
    console.log(`⚡ Force mode enabled - will update existing songs\n`);
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalMonths = 0;

  const startTime = Date.now();

  // fetchAllSongs는 제너레이터이므로 for await...of 사용
  for await (const { yearMonth, songs } of tjService.fetchAllSongs()) {
    totalMonths++;

    if (songs.length === 0) {
      console.log(`⚠️  [${yearMonth}] No songs found`);
      continue;
    }

    console.log(`\n📋 [${yearMonth}] Processing ${songs.length} songs`);

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      console.log(`  [${i + 1}/${songs.length}] ${song.karaokeNo} - ${song.title}`);

      try {
        const result = await saveSongToDatabase(song, force);
        if (result === 'created') {
          totalCreated++;
        } else if (result === 'updated') {
          totalUpdated++;
        } else if (result === 'skipped') {
          totalSkipped++;
        }
      } catch (error) {
        totalErrors++;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const elapsed = Date.now() - startTime;
    const elapsedHours = (elapsed / (1000 * 60 * 60)).toFixed(2);

    console.log(`  ✅ [${yearMonth}] Completed`);
    console.log(`  📊 Progress: Months ${totalMonths} | Created ${totalCreated} | Updated ${totalUpdated} | Skipped ${totalSkipped} | Errors ${totalErrors}`);
    console.log(`  ⏱️  Elapsed: ${elapsedHours} hours`);
  }

  const totalTime = ((Date.now() - startTime) / (1000 * 60 * 60)).toFixed(2);
  console.log(`\n✅ Fetch completed!`);
  console.log(`   Total months: ${totalMonths}`);
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Total time: ${totalTime} hours`);
}

// 커맨드 라인 인자에서 --force 플래그 가져오기
const args = process.argv.slice(2);
const force = args.includes('--force');

// 스크립트 실행
fetchAllTJSongs(force)
  .then(async () => {
    console.log('\n🎉 Done!');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n💥 Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
