/**
 * TJ 곡들의 saved 상태 업데이트 스크립트
 *
 * KaraokeSong 테이블에 TJ 번호로 등록된 곡들을 찾아서
 * TjSong 테이블의 해당 곡들의 saved를 true로 설정합니다.
 *
 * 이미 song 테이블에 연결되어 있는 TJ 곡들을 식별하기 위한 스크립트입니다.
 */

// pnpm ts-node src/scripts/tj/update-saved-status.ts
// pnpm ts-node src/scripts/tj/update-saved-status.ts --dry-run

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryrun");

async function updateSavedStatus() {
  if (isDryRun) {
    console.log("🔍 [DRY RUN] TJ 곡들의 saved 상태를 확인합니다...\n");
  } else {
    console.log("🔍 TJ 곡들의 saved 상태를 업데이트합니다...\n");
  }

  try {
    // 1. KaraokeSong 테이블에서 provider가 'TJ'인 곡들의 karaokeNo 조회
    const tjKaraokeSongs = await prisma.karaokeSong.findMany({
      where: {
        provider: "TJ",
      },
      select: {
        karaokeNo: true,
      },
    });

    const tjNumbers = tjKaraokeSongs.map((song) => song.karaokeNo);

    console.log(`📊 총 ${tjNumbers.length}개의 TJ 곡이 KaraokeSong 테이블에 등록되어 있습니다.\n`);

    if (tjNumbers.length === 0) {
      console.log("⚠️  업데이트할 곡이 없습니다.");
      return;
    }

    if (isDryRun) {
      // Dry run: 업데이트 대상 개수만 확인
      const targetCount = await prisma.tjSong.count({
        where: {
          id: {
            in: tjNumbers,
          },
        },
      });

      console.log(`[DRY RUN] ${targetCount}개의 TJ 곡의 saved 상태를 true로 업데이트할 예정입니다.`);
      console.log(`[DRY RUN] 실제 업데이트를 실행하려면 --dry-run 옵션 없이 실행하세요.`);
    } else {
      // 2. TjSong 테이블에서 해당 id들의 saved를 true로 업데이트
      const result = await prisma.tjSong.updateMany({
        where: {
          id: {
            in: tjNumbers,
          },
        },
        data: {
          saved: true,
        },
      });

      console.log(`✅ ${result.count}개의 TJ 곡의 saved 상태를 true로 업데이트했습니다.`);
    }

    // 3. 현재 통계 출력
    const savedCount = await prisma.tjSong.count({
      where: { saved: true },
    });
    const totalCount = await prisma.tjSong.count();

    const statsPrefix = isDryRun ? "\n📈 현재 통계:" : "\n📈 업데이트 후 통계:";
    console.log(statsPrefix);
    console.log(`   - 전체 TJ 곡: ${totalCount}개`);
    console.log(`   - Saved 곡: ${savedCount}개`);
    console.log(`   - Saved 비율: ${((savedCount / totalCount) * 100).toFixed(2)}%`);
  } catch (error) {
    console.error("❌ 에러 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

updateSavedStatus();
