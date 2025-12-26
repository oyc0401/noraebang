import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TJService, type TJSongData } from '../../tj/tj.service';
import { generateAlias } from '../../lib/alias-generator';

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
    // 아티스트 찾기 또는 생성
    let artist = await prisma.artist.findFirst({
      where: {
        OR: [{ name: song.artist }, { nameNorm: song.artist }],
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
        console.error(`  ❌ Alias 중복! "${song.artist}" → "${newAlias}"`);
        console.error(`     이미 존재하는 아티스트: "${existingArtist.name}"`);
        throw new Error(
          `Alias collision: "${newAlias}" already exists for "${existingArtist.name}"`,
        );
      }

      artist = await prisma.artist.create({
        data: {
          name: song.artist,
          nameKo: song.artist,
          nameNorm: song.artist,
          alias: newAlias,
        },
      });
      console.log(`  📝 Created new artist: ${song.artist} → "${newAlias}"`);
    } else {
      // 기존 아티스트가 있는 경우 alias 체크
      if (artist.alias !== newAlias) {
        console.log(
          `  🔄 Alias 불일치! "${song.artist}": "${artist.alias}" → "${newAlias}"`,
        );

        // 새 alias가 다른 아티스트와 충돌하는지 확인
        const existingArtist = await prisma.artist.findUnique({
          where: { alias: newAlias },
        });

        if (existingArtist && existingArtist.id !== artist.id) {
          console.error(`  ❌ Alias 중복! 다른 아티스트 "${existingArtist.name}"와 충돌`);
          throw new Error(
            `Alias collision: "${newAlias}" already exists for "${existingArtist.name}"`,
          );
        }

        // alias 업데이트
        artist = await prisma.artist.update({
          where: { id: artist.id },
          data: { alias: newAlias },
        });
        console.log(`  ✅ Alias 업데이트 완료: "${artist.alias}"`);
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
      return false;
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

  // 1. 최신곡 페이지에서 곡 정보 통으로 가져오기
  const songs = await tjService.fetchRecentSongs();

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

    // Rate limiting: 500ms 대기 (API 호출 안하므로 짧게)
    await new Promise((resolve) => setTimeout(resolve, 500));
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
