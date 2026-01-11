/**
 * Song의 KaraokeSong 중 TJ 번호를 tjSongId에 매핑
 *
 * - Song의 karaokeSongs 중 provider가 TJ인 것을 찾아서 tjSongId에 매핑
 * - 여러 TJ 번호가 있는 경우 첫 번째 것을 사용
 * - 이미 tjSongId가 설정된 Song은 스킵 (--force로 덮어쓰기 가능)
 *
 * 사용법:
 * pnpm ts-node src/scripts/tj/map-song-to-tj.ts
 * pnpm ts-node src/scripts/tj/map-song-to-tj.ts --dry-run
 * pnpm ts-node src/scripts/tj/map-song-to-tj.ts --force
 * pnpm ts-node src/scripts/tj/map-song-to-tj.ts --force --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { getTJSongByNumber } from "../../thirdparty/tj/getTJSongByNumber.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes("--dry-run");
const isForce = process.argv.includes("--force");

async function main() {
  console.log("🚀 Song - TjSong 매핑 시작");
  console.log(`   Mode: ${isDryRun ? "DRY RUN" : "REAL"}`);
  console.log(`   Force: ${isForce ? "ON" : "OFF"}`);
  console.log("");

  // 1. KaraokeSong이 있는 Song 조회
  const songs = await prisma.song.findMany({
    where: {
      karaokeSongs: {
        some: {
          provider: "TJ",
        },
      },
    },
    include: {
      karaokeSongs: true,
    },
  });

  console.log(`📊 대상 Song: ${songs.length}개`);

  if (songs.length === 0) {
    console.log("✅ 매핑할 Song이 없습니다.");
    return;
  }

  let successCount = 0;
  let skipNoKaraokeSong = 0;
  let createdTjSongCount = 0;
  let skipAlreadyMapped = 0;
  let errorCount = 0;

  for (const song of songs) {
    // TJ provider인 karaokeSong만 필터링
    const tjKaraokeSongs = song.karaokeSongs.filter((k) => k.provider === "TJ");

    if (tjKaraokeSongs.length === 0) {
      skipNoKaraokeSong++;
      continue;
    }

    // 이미 매핑되어 있고 force 아니면 스킵
    if (song.tjSongId && !isForce) {
      skipAlreadyMapped++;
      continue;
    }

    const tjKaraokeSong = tjKaraokeSongs[0]; // 첫 번째 TJ 노래 사용

    try {
      // TjSong이 존재하는지 확인
      let tjSong = await prisma.tjSong.findUnique({
        where: { id: tjKaraokeSong.karaokeNo },
      });

      // TjSong이 없으면 크롤링해서 생성
      if (!tjSong) {
        console.log(
          `🔍 [TjSong 생성] Song ${song.id} (${song.title}) - TJ번호 ${tjKaraokeSong.karaokeNo} 크롤링 시작`,
        );

        if (!isDryRun) {
          try {
            // 1초 지연 (rate limiting)
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const tjSongInfo = await getTJSongByNumber(tjKaraokeSong.karaokeNo);

            // TjSong 생성
            tjSong = await prisma.tjSong.create({
              data: {
                id: tjSongInfo.songNumber,
                title: tjSongInfo.title,
                artist: tjSongInfo.artist,
                artistList: [],
                featureList: [],
                producerList: [],
                lyricist: tjSongInfo.lyricist ?? null,
                lyricistList: [],
                composer: tjSongInfo.composer ?? null,
                composerList: [],
                youtubeLink: tjSongInfo.youtubeLink ?? null,
                isMR: tjSongInfo.isMR,
                isMV: tjSongInfo.isMV,
                isOver60: tjSongInfo.isOver60,
              },
            });

            console.log(`✅ TjSong 생성 완료: ${tjSong.id} - ${tjSong.title}`);
            createdTjSongCount++;
          } catch (crawlError: any) {
            console.error(
              `❌ TjSong 크롤링 실패 (${tjKaraokeSong.karaokeNo}): ${crawlError.message}`,
            );
            errorCount++;
            continue;
          }
        } else {
          console.log(`[DRY] TjSong 생성 예정: ${tjKaraokeSong.karaokeNo}`);
          createdTjSongCount++;
        }
      }

      if (isDryRun) {
        successCount++;
      } else {
        await prisma.song.update({
          where: { id: song.id },
          data: { tjSongId: tjKaraokeSong.karaokeNo },
        });
        successCount++;
      }
    } catch (error: any) {
      console.error(`❌ Song ${song.id} 처리 실패:`, error.message);
      errorCount++;
    }
  }

  console.log("");
  console.log("📊 결과 요약:");
  console.log(`   매핑 성공: ${successCount}개`);
  console.log(`   TjSong 생성: ${createdTjSongCount}개`);
  console.log(`   스킵 (이미 매핑됨): ${skipAlreadyMapped}개`);
  console.log(`   스킵 (TJ KaraokeSong 없음): ${skipNoKaraokeSong}개`);
  console.log(`   실패: ${errorCount}개`);

  if (isDryRun) {
    console.log("");
    console.log(
      "💡 --dry-run 모드입니다. 실제로 적용하려면 옵션을 제거하세요.",
    );
  }
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
