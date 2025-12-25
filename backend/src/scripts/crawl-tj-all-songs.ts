import 'dotenv/config';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface TJSongData {
  karaokeNo: string;
  title: string;
  artist: string;
  lyricist: string;
  composer: string;
  nationType: string;
}

const BASE_URL = 'https://www.tjmedia.com/song/accompaniment_search';

/**
 * 곡번호로 TJ 곡 검색
 */
async function searchBySongNumber(songNumber: number): Promise<TJSongData | null> {
  const url = `${BASE_URL}?nationType=&strType=16&searchTxt=${songNumber}&pageNo=1&pageRowCnt=100`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 곡번호 검색은 정확히 매칭되는 1곡만 반환
    const row = $('ul.grid-container.list').first();
    if (row.length === 0) {
      return null;
    }

    const items = row.find('li.grid-item');
    if (items.length === 0) {
      return null;
    }

    // 곡번호 추출
    const karaokeNo = $(items[0]).find('.num2').text().trim();
    if (!karaokeNo || karaokeNo !== songNumber.toString()) {
      // 정확히 매칭되지 않으면 무시 (부분 매칭 방지)
      return null;
    }

    // 곡제목 추출
    const title = $(items[1]).find('p span').first().text().trim();

    // 가수 추출
    let artist = $(items[2]).find('.highlight').text().trim();
    if (!artist) {
      artist = $(items[2]).find('p > span > span').first().text().trim();
    }
    if (!artist) {
      artist = $(items[2]).find('p').text().trim();
    }

    // 작사가 추출
    const lyricist = $(items[3]).find('p span').text().trim();

    // 작곡가 추출
    const composer = $(items[4]).find('p span').text().trim();

    if (!title || !artist) {
      return null;
    }

    // 국가 타입 추정 (간단한 휴리스틱)
    let nationType = 'KOR'; // 기본값
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(title) || /[\u3040-\u309F\u30A0-\u30FF]/.test(artist)) {
      nationType = 'JPN';
    } else if (/[a-zA-Z]/.test(title) && !/[가-힣]/.test(title)) {
      nationType = 'ENG';
    }

    return {
      karaokeNo,
      title,
      artist,
      lyricist: lyricist || '',
      composer: composer || '',
      nationType,
    };
  } catch (error) {
    console.error(`❌ Fetch error for song ${songNumber}:`, error);
    return null;
  }
}

/**
 * 곡 데이터를 DB에 저장
 */
async function saveSongToDatabase(song: TJSongData): Promise<boolean> {
  try {
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

    // 아티스트 찾기 또는 생성
    let artist = await prisma.artist.findFirst({
      where: {
        OR: [{ name: song.artist }, { nameNorm: song.artist }],
      },
    });

    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: song.artist,
          nameKo: song.artist,
          nameNorm: song.artist,
          alias: song.artist
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-'),
        },
      });
    }

    // 곡 찾기 또는 생성
    let songRecord = await prisma.song.findFirst({
      where: {
        title: song.title,
        artistId: artist.id,
      },
    });

    if (!songRecord) {
      songRecord = await prisma.song.create({
        data: {
          title: song.title,
          titleNorm: song.title,
          artistId: artist.id,
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
 * 메인 크롤링 함수
 */
async function crawlAllTJSongs() {
  console.log('🚀 Starting TJ Media ALL songs crawl...\n');
  console.log('📋 Crawling song numbers: 1 ~ 99999');
  console.log('⏱️  Estimated time: ~27 hours (with 1s delay)\n');

  const START_NUMBER = 1;
  const END_NUMBER = 99999;
  const DELAY_MS = 1000;

  let totalFound = 0;
  let totalSaved = 0;
  let totalSkipped = 0;

  const startTime = Date.now();

  for (let songNo = START_NUMBER; songNo <= END_NUMBER; songNo++) {
    const song = await searchBySongNumber(songNo);

    if (song) {
      totalFound++;
      const saved = await saveSongToDatabase(song);

      if (saved) {
        totalSaved++;
        console.log(
          `✅ [${songNo}/${END_NUMBER}] ${song.karaokeNo} - ${song.title} / ${song.artist}`,
        );
      } else {
        totalSkipped++;
        console.log(`⏭️  [${songNo}/${END_NUMBER}] ${song.karaokeNo} - Already exists`);
      }
    }

    // 진행 상황 로깅 (1000곡마다)
    if (songNo % 1000 === 0) {
      const elapsed = Date.now() - startTime;
      const avgTimePerSong = elapsed / (songNo - START_NUMBER + 1);
      const remaining = (END_NUMBER - songNo) * avgTimePerSong;
      const remainingHours = (remaining / (1000 * 60 * 60)).toFixed(1);

      console.log(`\n📊 Progress: ${songNo}/${END_NUMBER}`);
      console.log(`   Found: ${totalFound}, Saved: ${totalSaved}, Skipped: ${totalSkipped}`);
      console.log(`   Estimated remaining time: ${remainingHours} hours\n`);
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  const totalTime = ((Date.now() - startTime) / (1000 * 60 * 60)).toFixed(2);
  console.log(`\n✅ Crawl completed!`);
  console.log(`   Total found: ${totalFound}`);
  console.log(`   Total saved: ${totalSaved}`);
  console.log(`   Total skipped: ${totalSkipped}`);
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
