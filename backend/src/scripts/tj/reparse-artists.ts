 import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { parseTJArtist } from '../../lib/artist-parser';

// 기존 TJ 곡의 artist 필드를 재파싱하여 featureList, producerList 업데이트
// pnpm ts-node src/scripts/tj/reparse-artists.ts
// pnpm ts-node src/scripts/tj/reparse-artists.ts --dry-run

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 1000;

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🎵 TJ 곡 아티스트 재파싱 시작');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (실제 업데이트 안 함)' : 'LIVE (실제 업데이트)'}`);
  console.log('');

  // 전체 곡 수 조회
  const totalCount = await prisma.tjSong.count();
  console.log(`📊 전체 곡 수: ${totalCount.toLocaleString()}곡`);
  console.log('');

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // 배치로 처리
  let offset = 0;
  while (offset < totalCount) {
    const songs = await prisma.tjSong.findMany({
      skip: offset,
      take: BATCH_SIZE,
      select: {
        id: true,
        artist: true,
        artistList: true,
        featureList: true,
        producerList: true,
      },
    });

    console.log(`\n📦 배치 ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)} (${offset + 1}-${offset + songs.length})`);

    for (const song of songs) {
      processed++;

      try {
        if (!song.artist) {
          skipped++;
          continue;
        }

        // 아티스트 재파싱
        const parsed = parseTJArtist(song.artist);

        // 기존 값과 비교하여 변경이 있는지 확인
        const artistChanged = JSON.stringify(song.artistList) !== JSON.stringify(parsed.artist);
        const featureChanged = JSON.stringify(song.featureList) !== JSON.stringify(parsed.feature);
        const producerChanged = JSON.stringify(song.producerList) !== JSON.stringify(parsed.producer);

        if (!artistChanged && !featureChanged && !producerChanged) {
          skipped++;
          continue;
        }

        // 샘플 출력 (처음 10개)
        if (updated < 10) {
          console.log(`  ✅ ${song.id}: ${song.artist}`);
          if (artistChanged) {
            console.log(`     Artist: [${song.artistList.join(', ')}] → [${parsed.artist.join(', ')}]`);
          }
          if (featureChanged) {
            console.log(`     Feat: [${song.featureList.join(', ')}] → [${parsed.feature.join(', ')}]`);
          }
          if (producerChanged) {
            console.log(`     Prod: [${song.producerList.join(', ')}] → [${parsed.producer.join(', ')}]`);
          }
        }

        // 실제 업데이트 (dry-run이 아닐 때만)
        if (!isDryRun) {
          await prisma.tjSong.update({
            where: { id: song.id },
            data: {
              artistList: parsed.artist,
              featureList: parsed.feature,
              producerList: parsed.producer,
            },
          });
        }

        updated++;
      } catch (error) {
        errors++;
        console.error(`  ❌ Error processing song ${song.id}:`, error);
      }
    }

    offset += BATCH_SIZE;

    // 진행 상황 출력
    console.log(`   진행: ${processed}/${totalCount} | 업데이트: ${updated} | 스킵: ${skipped} | 에러: ${errors}`);
  }

  console.log('\n');
  console.log('✨ 완료!');
  console.log(`총 처리: ${processed.toLocaleString()}곡`);
  console.log(`업데이트: ${updated.toLocaleString()}곡 (${((updated / processed) * 100).toFixed(1)}%)`);
  console.log(`스킵: ${skipped.toLocaleString()}곡`);
  console.log(`에러: ${errors.toLocaleString()}곡`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
