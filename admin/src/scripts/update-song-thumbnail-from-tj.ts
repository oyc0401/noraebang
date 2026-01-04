// pnpm ts-node src/scripts/update-song-thumbnail-from-tj.ts
// pnpm ts-node src/scripts/update-song-thumbnail-from-tj.ts --dry-run

/**
 * Song 테이블의 thumbnailDefault를 TjSong의 thumbnailImg로 업데이트하는 스크립트
 *
 * 동작:
 * 1. Song 테이블의 모든 레코드를 조회
 * 2. 각 Song에 연결된 KaraokeSong 중 provider가 TJ인 것을 찾음
 * 3. 해당 karaokeNo로 TjSong을 조회
 * 4. TjSong의 thumbnailImg를 Song의 thumbnailDefault에 업데이트
 *
 * 옵션:
 * --dry-run: 실제 업데이트를 하지 않고 어떤 변경이 발생할지만 출력
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - 실제 업데이트는 수행되지 않습니다.\n");
  }

  console.log("Starting to update Song thumbnailDefault from TjSong...");

  // Song 전체 조회 (karaokeSongs 포함)
  const songs = await prisma.song.findMany({
    include: {
      karaokeSongs: {
        where: {
          provider: "TJ",
        },
      },
    },
  });

  console.log(`총 ${songs.length}개의 Song을 확인합니다.\n`);

  let updatedCount = 0;
  let skippedNoTjKaraoke = 0;
  let skippedNoThumbnail = 0;
  let skippedAlreadySame = 0;
  let notFoundCount = 0;

  for (const song of songs) {
    // TJ KaraokeSong이 없으면 스킵
    if (song.karaokeSongs.length === 0) {
      skippedNoTjKaraoke++;
      continue;
    }

    // 첫 번째 TJ KaraokeSong의 karaokeNo 사용
    const tjKaraokeNo = song.karaokeSongs[0].karaokeNo;

    // TjSong 조회
    const tjSong = await prisma.tjSong.findUnique({
      where: { id: tjKaraokeNo },
    });

    if (!tjSong) {
      notFoundCount++;
      console.log(
        `⚠️  Song ID ${song.id} (${song.title}): TjSong을 찾을 수 없음 (karaokeNo: ${tjKaraokeNo})`,
      );
      continue;
    }

    // TjSong에 thumbnailImg가 없으면 스킵
    if (!tjSong.thumbnailImg) {
      skippedNoThumbnail++;
      continue;
    }

    // 이미 같은 값이면 스킵
    if (song.thumbnailDefault === tjSong.thumbnailImg) {
      skippedAlreadySame++;
      continue;
    }

    console.log(
      `✅ Song ID ${song.id} (${song.title}): ${song.thumbnailDefault ?? "없음"} -> ${tjSong.thumbnailImg}`,
    );

    // 실제 업데이트
    if (!isDryRun) {
      await prisma.song.update({
        where: { id: song.id },
        data: {
          thumbnailDefault: tjSong.thumbnailImg,
        },
      });
    }

    updatedCount++;
  }

  console.log("\n=== 요약 ===");
  console.log(`총 Song 수: ${songs.length}`);
  console.log(`업데이트됨: ${updatedCount}`);
  console.log(`\n[스킵 사유별 상세]`);
  console.log(`  - TJ 노래방 번호가 없는 Song: ${skippedNoTjKaraoke}`);
  console.log(`  - TjSong의 썸네일이 없음: ${skippedNoThumbnail}`);
  console.log(`  - 이미 같은 썸네일임: ${skippedAlreadySame}`);
  console.log(`  - TjSong을 찾을 수 없음: ${notFoundCount}`);
  console.log(
    `  - 스킵 합계: ${skippedNoTjKaraoke + skippedNoThumbnail + skippedAlreadySame + notFoundCount}`,
  );

  if (isDryRun) {
    console.log("\n🔍 DRY RUN이므로 실제 업데이트는 수행되지 않았습니다.");
  }
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
