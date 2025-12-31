import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TJService, type TJSongData } from  '../../tj/tj.service';
import { generateAlias } from '../../lib/alias-generator';

// pnpm ts-node src/scripts/tj/fetch-all-songs.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tjService = new TJService();

/**
 * 곡 데이터를 DB에 저장
 */
async function saveSongToDatabase(song: TJSongData): Promise<boolean> {
  try {
    // 아티스트 찾기 또는 생성
    let artist = await prisma.artist.findFirst({
      where: {
        name: song.artist,
      },
    });

    // 새로운 alias 생성
    const newAlias = await generateAlias(song.artist);

    if (!artist) {
      // alias 중복 체크
      const existingArtist = await prisma.artist.findUnique({
        where: { alias: newAlias },
      });

      if (existingArtist) {
        console.error(`❌ Alias 중복! "${song.artist}" → "${newAlias}"`);
        console.error(`   이미 존재하는 아티스트: "${existingArtist.name}"`);
        throw new Error(
          `Alias collision: "${newAlias}" already exists for "${existingArtist.name}"`,
        );
      }

      artist = await prisma.artist.create({
        data: {
          name: song.artist,
          nameKo: song.artist,
          alias: newAlias,
        },
      });
      console.log(`✅ 새 아티스트 생성: "${song.artist}" → "${newAlias}"`);
    } else {
      // 기존 아티스트가 있는 경우 alias 체크
      if (artist.alias !== newAlias) {
        console.log(
          `🔄 Alias 불일치 감지! "${song.artist}": "${artist.alias}" → "${newAlias}"`,
        );

        // 새 alias가 다른 아티스트와 충돌하는지 확인
        const existingArtist = await prisma.artist.findUnique({
          where: { alias: newAlias },
        });

        if (existingArtist && existingArtist.id !== artist.id) {
          console.error(`❌ Alias 중복! 다른 아티스트 "${existingArtist.name}"와 충돌`);
          throw new Error(
            `Alias collision: "${newAlias}" already exists for "${existingArtist.name}"`,
          );
        }

        // alias 업데이트
        artist = await prisma.artist.update({
          where: { id: artist.id },
          data: { alias: newAlias },
        });
        console.log(`✅ Alias 업데이트 완료: "${artist.alias}"`);
      }
    }

    // 기존 곡이 있는지 확인
    const existingSong = await prisma.karaokeSong.findUnique({
      where: {
        provider_karaokeNo: {
          provider: 'TJ',
          karaokeNo: song.karaokeNo,
        },
      },
    });

    if (existingSong) {
      return false; // 이미 존재
    }

    // 곡 찾기 또는 생성 (ArtistSong 관계를 통해)
    let songRecord = await prisma.song.findFirst({
      where: {
        title: song.title,
        artistSongs: {
          some: {
            artistId: artist.id,
          },
        },
      },
    });

    if (!songRecord) {
      songRecord = await prisma.song.create({
        data: {
          title: song.title,
          artistSongs: {
            create: {
              artistId: artist.id,
              order: 0,
            },
          },
        },
      });
    }

    // KaraokeSong 생성
    await prisma.karaokeSong.create({
      data: {
        songId: songRecord.id,
        provider: 'TJ',
        karaokeNo: song.karaokeNo,
        lastSeenAt: new Date(),
        ingestedAt: new Date(),
        ingestedFrom: `TJ_ALL_CRAWL`,
      },
    });

    return true;
  } catch (error) {
    console.error(`❌ Error saving song ${song.karaokeNo}:`, error);
    return false;
  }
}

/**
 * 메인 크롤링 함수 - 2001년 1월부터 현재까지 모든 월 크롤링
 */
async function crawlAllTJSongs() {
  console.log('🚀 Starting TJ Media ALL songs crawl (2001-01 ~ now)...\n');

  let totalFound = 0;
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let monthsProcessed = 0;

  const startTime = Date.now();

  // AsyncGenerator를 사용해서 월별 데이터 가져오기
  for await (const { yearMonth, songs } of tjService.fetchAllMonthsSongs()) {
    monthsProcessed++;

    console.log(`\n📅 [Month ${monthsProcessed}] Processing ${yearMonth}...`);

    if (songs.length === 0) {
      console.log(`   ⚠️  No songs found`);
      continue;
    }

    console.log(`   📋 Found ${songs.length} songs`);
    totalFound += songs.length;

    // 각 곡 저장
    let monthSaved = 0;
    let monthSkipped = 0;
    let monthErrors = 0;

    for (const song of songs) {
      try {
        const saved = await saveSongToDatabase(song);
        if (saved) {
          monthSaved++;
          totalSaved++;
        } else {
          monthSkipped++;
          totalSkipped++;
        }
      } catch (error) {
        monthErrors++;
        totalErrors++;
        console.error(`   ❌ Error saving ${song.karaokeNo}:`, error);
      }
    }

    console.log(
      `   ✅ Month result: Saved ${monthSaved}, Skipped ${monthSkipped}, Errors ${monthErrors}`,
    );

    // 전체 진행 상황
    const elapsed = Date.now() - startTime;
    const elapsedHours = (elapsed / (1000 * 60 * 60)).toFixed(2);

    console.log(`   📊 Total: Found ${totalFound}, Saved ${totalSaved}, Skipped ${totalSkipped}, Errors ${totalErrors}`);
    console.log(`   ⏱️  Elapsed: ${elapsedHours} hours`);
  }

  const totalTime = ((Date.now() - startTime) / (1000 * 60 * 60)).toFixed(2);
  console.log(`\n✅ Crawl completed!`);
  console.log(`   Months processed: ${monthsProcessed}`);
  console.log(`   Total found: ${totalFound}`);
  console.log(`   Total saved: ${totalSaved}`);
  console.log(`   Total skipped: ${totalSkipped}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Total time: ${totalTime} hours`);
}

// 스크립트 실행
crawlAllTJSongs()
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
