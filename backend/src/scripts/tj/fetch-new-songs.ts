import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TJService, type TJSongData } from '../../tj/tj.service';

// pnpm ts-node src/scripts/tj/fetch-new-songs.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tjService = new TJService();

/**
 * 곡 데이터를 DB에 저장
 */
async function saveSongToDatabase(song: TJSongData): Promise<boolean> {
      // Rate limiting: 50ms 대기 (API 호출 안하므로 짧게)
    await new Promise((resolve) => setTimeout(resolve, 50));
  try {
    // 아티스트 찾기 또는 생성
    let artist = await prisma.artist.findFirst({
      where: {
        name: song.artist,
      },
    });

    if (!artist) {
      // alias 없이 아티스트 생성
      artist = await prisma.artist.create({
        data: {
          name: song.artist,
          nameKo: song.artist,
        },
      });
      console.log(`  📝 Created new artist: ${song.artist}`);
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
      return false;
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
      console.log(`  🎵 Created new song: ${song.title}`);
    }

    // KaraokeSong 생성
    await prisma.karaokeSong.create({
      data: {
        songId: songRecord.id,
        provider: 'TJ',
        karaokeNo: song.karaokeNo,
        lastSeenAt: new Date(),
        ingestedAt: new Date(),
        ingestedFrom: `TJ_NEW_CRAWL`,
      },
    });

    return true;
  } catch (error) {
    console.error(`  ❌ Error saving song ${song.karaokeNo}:`, error);
    return false;
  }
}

/**
 * 메인 크롤링 함수
 */
async function crawlNewTJSongs() {
  console.log('🚀 Starting TJ Media NEW songs crawl...\n');

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

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 2. 각 곡 정보 로그 출력
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    console.log(
      `\n[${i + 1}/${songs.length}] 💿 ${song.karaokeNo} - ${song.title} / ${song.artist}`,
    );

    // DB 저장 부분 주석 처리 - 데이터 확인용
    console.log('  📊 Song Data:', JSON.stringify(song, null, 2));

    // try {
    //   const saved = await saveSongToDatabase(song);

    //   if (saved) {
    //     totalSaved++;
    //     console.log(`  ✅ Saved`);
    //   } else {
    //     totalSkipped++;
    //     console.log(`  ⏭️  Skipped: Already exists`);
    //   }
    // } catch (error) {
    //   totalErrors++;
    //   console.log(`  ❌ Error:`, error);
    // }

  }

  console.log(`\n✅ Crawl completed!`);
  console.log(`   Total saved: ${totalSaved}`);
  console.log(`   Total skipped: ${totalSkipped}`);
  console.log(`   Total errors: ${totalErrors}`);
}

// 스크립트 실행
crawlNewTJSongs()
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
