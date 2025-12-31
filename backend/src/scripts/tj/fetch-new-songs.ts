import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TJService, type TJSongData } from '../../tj/tj.service';
import { parseTJArtist } from '../../lib/artist-parser';

// pnpm ts-node src/scripts/tj/fetch-new-songs.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tjService = new TJService();

/**
 * 곡 데이터를 DB에 저장
 */
async function saveSongToDatabase(song: TJSongData): Promise<boolean> {
  try {
    // 아티스트 문자열 파싱
    const parsed = parseTJArtist(song.artist);

    if (parsed.artist.length === 0) {
      console.log(`  ⚠️  No main artists found for: ${song.artist}`);
      return false;
    }

    const logParts = [`Main: ${parsed.artist.join(', ')}`];
    if (parsed.feature.length > 0)
      logParts.push(`Feat: ${parsed.feature.join(', ')}`);
    if (parsed.producer.length > 0)
      logParts.push(`Prod: ${parsed.producer.join(', ')}`);
    console.log(`  👥 ${logParts.join(' / ')}`);

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

    // 모든 아티스트(메인, 피처링, 프로듀서) 처리
    const allArtistNames = [
      ...parsed.artist,
      ...parsed.feature,
      ...parsed.producer,
    ];
    const uniqueArtistNames = [...new Set(allArtistNames)];

    // 각 아티스트에 대해 Artist 레코드 찾기 또는 생성
    const artistMap = new Map<string, { id: number; name: string }>();
    for (const artistName of uniqueArtistNames) {
      let artist = await prisma.artist.findFirst({
        where: {
          name: artistName,
        },
      });

      if (!artist) {
        artist = await prisma.artist.create({
          data: {
            name: artistName,
            nameKo: artistName,
          },
        });
        console.log(`  📝 Created new artist: ${artistName}`);
      }

      artistMap.set(artistName, { id: artist.id, name: artist.name });
    }

    // 첫 번째 메인 아티스트를 기준으로 기존 곡 찾기
    const firstMainArtist = artistMap.get(parsed.artist[0])!;
    let songRecord = await prisma.song.findFirst({
      where: {
        title: song.title,
        artistSongs: {
          some: {
            artistId: firstMainArtist.id,
            role: 'MAIN',
          },
        },
      },
    });

    if (!songRecord) {
      // 곡 생성 및 모든 아티스트와 관계 생성
      const artistSongRelations: Prisma.ArtistSongUncheckedCreateWithoutSongInput[] =
        [
          // 메인 아티스트
          ...parsed.artist.map((name, index) => ({
            artistId: artistMap.get(name)!.id,
            order: index,
            role: 'MAIN' as const,
          })),
          // 피처링 아티스트
          ...parsed.feature.map((name, index) => ({
            artistId: artistMap.get(name)!.id,
            order: index,
            role: 'FEATURING' as const,
          })),
          // 프로듀서
          ...parsed.producer.map((name, index) => ({
            artistId: artistMap.get(name)!.id,
            order: index,
            role: 'PRODUCER' as const,
          })),
        ];

      songRecord = await prisma.song.create({
        data: {
          title: song.title,
          artistSongs: {
            create: artistSongRelations,
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

  // 2. 각 곡 정보 저장
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    console.log(
      `\n[${i + 1}/${songs.length}] 💿 ${song.karaokeNo} - ${song.title} / ${song.artist}`,
    );

    try {
      const saved = await saveSongToDatabase(song);

      if (saved) {
        totalSaved++;
        console.log(`  ✅ Saved`);
      } else {
        totalSkipped++;
        console.log(`  ⏭️  Skipped: Already exists`);
      }
    } catch (error) {
      totalErrors++;
      console.log(`  ❌ Error:`, error);
    }

    // Rate limiting: 50ms 대기
    await new Promise((resolve) => setTimeout(resolve, 50));
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
