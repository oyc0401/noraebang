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

const RECENT_SONG_URL = 'https://www.tjmedia.com/song/recent_song';
const SEARCH_URL = 'https://www.tjmedia.com/song/accompaniment_search';

/**
 * 최신곡 페이지에서 곡번호 목록 추출
 */
async function fetchRecentSongNumbers(): Promise<string[]> {
  try {
    const response = await fetch(RECENT_SONG_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const songNumbers: string[] = [];

    // 최신곡 목록에서 곡번호 추출
    // 페이지에서 곡번호는 특정 요소에 표시됨
    $('body').find('*').each((_, element) => {
      const text = $(element).text().trim();
      // 5자리 숫자 패턴 찾기 (TJ 곡번호는 보통 5자리)
      const matches = text.match(/^(\d{5,6})$/);
      if (matches) {
        const num = matches[1];
        if (!songNumbers.includes(num)) {
          songNumbers.push(num);
        }
      }
    });

    console.log(`📋 Found ${songNumbers.length} recent song numbers`);
    return songNumbers;
  } catch (error) {
    console.error(`❌ Fetch error for recent songs:`, error);
    return [];
  }
}

/**
 * 곡번호로 상세 정보 검색
 */
async function searchBySongNumber(songNumber: string): Promise<TJSongData | null> {
  const url = `${SEARCH_URL}?nationType=&strType=16&searchTxt=${songNumber}&pageNo=1&pageRowCnt=100`;

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

    const row = $('ul.grid-container.list').first();
    if (row.length === 0) {
      return null;
    }

    const items = row.find('li.grid-item');
    if (items.length === 0) {
      return null;
    }

    // 곡번호 확인
    const karaokeNo = $(items[0]).find('.num2').text().trim();
    if (!karaokeNo || karaokeNo !== songNumber) {
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

    // 국가 타입 추정
    let nationType = 'KOR';
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
      return false;
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
      console.log(`  📝 Created new artist: ${song.artist}`);
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

  // 1. 최신곡 페이지에서 곡번호 목록 가져오기
  const songNumbers = await fetchRecentSongNumbers();

  if (songNumbers.length === 0) {
    console.log('⚠️  No recent songs found');
    return;
  }

  console.log(`\n📋 Processing ${songNumbers.length} recent songs\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 2. 각 곡번호로 상세 정보 조회 및 저장
  for (let i = 0; i < songNumbers.length; i++) {
    const songNo = songNumbers[i];
    console.log(`\n[${i + 1}/${songNumbers.length}] 🔍 Fetching song ${songNo}...`);

    const song = await searchBySongNumber(songNo);

    if (song) {
      const saved = await saveSongToDatabase(song);

      if (saved) {
        totalSaved++;
        console.log(`  ✅ Saved: ${song.title} / ${song.artist}`);
      } else {
        totalSkipped++;
        console.log(`  ⏭️  Skipped: Already exists`);
      }
    } else {
      totalErrors++;
      console.log(`  ❌ Not found or error`);
    }

    // Rate limiting: 1초 대기
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
