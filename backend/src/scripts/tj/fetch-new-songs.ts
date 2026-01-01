import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TJService } from '../../tj/tj.service';
import { saveSongToDatabase } from './saveSong';

// 현재 월의 TJ 노래 크롤링
// pnpm ts-node src/scripts/tj/fetch-new-songs.ts
// pnpm ts-node src/scripts/tj/fetch-new-songs.ts --force

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tjService = new TJService();

/**
 * 메인 함수
 */
async function fetchNewTJSongs(force: boolean) {
  console.log('🚀 Starting TJ Media NEW songs fetch...\n');
  if (force) {
    console.log(`⚡ Force mode enabled - will update existing songs\n`);
  }

  // 현재 년월 계산
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. 최신곡 페이지에서 곡 정보 통으로 가져오기
  const songs = await tjService.fetchSongsByMonth(currentYearMonth);

  if (songs.length === 0) {
    console.log('⚠️  No recent songs found');
    return;
  }

  console.log(`\n📋 Processing ${songs.length} recent songs\n`);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 2. TjSong 테이블에 저장
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    console.log(`[${i + 1}/${songs.length}] ${song.karaokeNo} - ${song.title}`);

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

  console.log(`\n✅ Fetch completed!`);
  console.log(`   Total songs: ${songs.length}`);
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
}

// 커맨드 라인 인자에서 --force 플래그 가져오기
const args = process.argv.slice(2);
const force = args.includes('--force');

// 스크립트 실행
fetchNewTJSongs(force)
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
