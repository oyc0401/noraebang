/**
 * KaraokeSong에는 있지만 TjSong 테이블에는 없는 곡들을 찾는 스크립트
 *
 * KaraokeSong 테이블에 TJ 번호로 등록되어 있지만,
 * TjSong 테이블에는 아직 크롤링되지 않은 곡들의 리스트를 조회합니다.
 *
 * 이 곡들은 수동으로 추가되었거나, 크롤링이 누락된 곡들입니다.
 */

// pnpm ts-node src/scripts/tj/find-missing-tj-songs.ts
// pnpm ts-node src/scripts/tj/find-missing-tj-songs.ts --verbose

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isVerbose = process.argv.includes("--verbose") || process.argv.includes("-v");

async function findMissingTjSongs() {
  console.log("🔍 KaraokeSong에는 있지만 TjSong에는 없는 곡들을 찾습니다...\n");

  try {
    // 1. KaraokeSong 테이블에서 provider가 'TJ'인 모든 곡 조회
    const tjKaraokeSongs = await prisma.karaokeSong.findMany({
      where: {
        provider: "TJ",
      },
      select: {
        karaokeNo: true,
        songId: true,
        song: {
          select: {
            title: true,
            titleKo: true,
          },
        },
      },
      orderBy: {
        karaokeNo: "asc",
      },
    });

    console.log(`📊 KaraokeSong 테이블의 TJ 곡: ${tjKaraokeSongs.length}개\n`);

    // 2. TjSong 테이블에 존재하는 ID들 조회
    const tjNumbers = tjKaraokeSongs.map((song) => song.karaokeNo);
    const existingTjSongs = await prisma.tjSong.findMany({
      where: {
        id: {
          in: tjNumbers,
        },
      },
      select: {
        id: true,
      },
    });

    const existingIds = new Set(existingTjSongs.map((song) => song.id));

    // 3. 누락된 곡들 필터링
    const missingSongs = tjKaraokeSongs.filter(
      (song) => !existingIds.has(song.karaokeNo)
    );

    console.log(`📊 TjSong 테이블에 존재하는 곡: ${existingTjSongs.length}개`);
    console.log(`❌ TjSong 테이블에 없는 곡: ${missingSongs.length}개\n`);

    if (missingSongs.length === 0) {
      console.log("✅ 모든 KaraokeSong의 TJ 곡이 TjSong 테이블에 존재합니다!");
      return;
    }

    // 4. 누락된 곡들 출력
    console.log("📋 누락된 곡 리스트:\n");
    console.log("TJ 번호 | Song ID | 제목");
    console.log("-".repeat(80));

    for (const song of missingSongs) {
      const title = song.song.titleKo || song.song.title;
      console.log(`${song.karaokeNo.padEnd(8)} | ${String(song.songId).padEnd(7)} | ${title}`);

      if (isVerbose) {
        console.log(`  원제: ${song.song.title}`);
        if (song.song.titleKo) {
          console.log(`  한글: ${song.song.titleKo}`);
        }
        console.log("");
      }
    }

    // 5. 통계 요약
    console.log("\n" + "=".repeat(80));
    console.log(`총 ${missingSongs.length}개의 TJ 곡이 TjSong 테이블에 누락되어 있습니다.`);
    console.log(
      `KaraokeSong 대비 누락 비율: ${((missingSongs.length / tjKaraokeSongs.length) * 100).toFixed(2)}%`
    );

    // 6. TJ 번호 리스트 출력 (복사 편의용)
    console.log("\n📝 누락된 TJ 번호 리스트 (복사용):");
    const missingNumbers = missingSongs.map((song) => song.karaokeNo);
    console.log(missingNumbers.join(", "));
  } catch (error) {
    console.error("❌ 에러 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

findMissingTjSongs();