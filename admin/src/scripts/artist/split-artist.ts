/**
 * 아티스트를 두 개로 나누는 스크립트
 *
 * 기능:
 * - 기존 아티스트(60: 百足 & 韻マン)를 두 개로 분리
 * - 아티스트 60: 百足 (무카데)
 * - 아티스트 272: 韻マン (인만) - 새로 생성
 * - 모든 곡을 두 아티스트 모두에게 할당 (나중에 수동으로 정리)
 *
 * 사용법:
 * pnpm ts-node src/scripts/artist/split-artist.ts --dry-run
 * pnpm ts-node src/scripts/artist/split-artist.ts
 *
 * 주의:
 * - 실행 전 데이터 백업 권장
 * - 모든 곡이 두 아티스트에게 할당되므로 나중에 수동 정리 필요
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

// ========================================
// 설정
// ========================================
const OLD_ARTIST_ID = 60;
const NEW_ARTIST_ID = 272;

const OLD_ARTIST_DATA = {
  name: "百足",
  nameKo: "무카데",
};

const NEW_ARTIST_DATA = {
  name: "韻マン",
  nameKo: "인만",
};

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n=== 아티스트 분리 스크립트 ${isDryRun ? "(DRY RUN)" : ""} ===\n`);

  // 1. 기존 아티스트 확인
  console.log("Step 1: 기존 아티스트 확인...");
  const oldArtist = await prisma.artist.findUnique({
    where: { id: OLD_ARTIST_ID },
    include: {
      artistSongs: {
        include: {
          song: {
            select: { id: true, title: true, titleKo: true },
          },
        },
      },
    },
  });

  if (!oldArtist) {
    console.error(`❌ Artist ID ${OLD_ARTIST_ID} not found`);
    process.exit(1);
  }

  console.log(`✓ 기존 아티스트: [${oldArtist.id}] ${oldArtist.name} (${oldArtist.nameKo})`);
  console.log(`  관련 곡 수: ${oldArtist.artistSongs.length}개\n`);

  // 2. 새 아티스트 ID 확인
  console.log("Step 2: 새 아티스트 ID 확인...");
  const existingNewArtist = await prisma.artist.findUnique({
    where: { id: NEW_ARTIST_ID },
  });

  if (existingNewArtist) {
    console.error(`❌ Artist ID ${NEW_ARTIST_ID} already exists: ${existingNewArtist.name}`);
    console.error(`   다른 ID를 사용하거나 기존 아티스트를 삭제하세요.`);
    process.exit(1);
  }
  console.log(`✓ ID ${NEW_ARTIST_ID} 사용 가능\n`);

  // 3. 변경 사항 미리보기
  console.log("─".repeat(80));
  console.log("변경 사항:");
  console.log(`\n[기존] ID ${OLD_ARTIST_ID}:`);
  console.log(`  현재: ${oldArtist.name} (${oldArtist.nameKo})`);
  console.log(`  변경: ${OLD_ARTIST_DATA.name} (${OLD_ARTIST_DATA.nameKo})`);
  console.log(`\n[신규] ID ${NEW_ARTIST_ID}:`);
  console.log(`  생성: ${NEW_ARTIST_DATA.name} (${NEW_ARTIST_DATA.nameKo})`);
  console.log(`\n곡 매핑:`);
  console.log(`  ${oldArtist.artistSongs.length}개 곡을 두 아티스트 모두에게 할당`);
  console.log(`  (나중에 수동으로 불필요한 매핑 제거 필요)`);
  console.log("─".repeat(80));
  console.log();

  if (isDryRun) {
    console.log("💡 DRY RUN 모드: 실제 변경은 수행되지 않았습니다.");
    console.log("💡 실제 실행: pnpm ts-node src/scripts/artist/split-artist.ts\n");
    return;
  }

  // 4. 실행
  console.log("Step 3: 아티스트 분리 실행 중...\n");

  try {
    // 4.1. 기존 아티스트 업데이트
    console.log(`  [1/3] 기존 아티스트(${OLD_ARTIST_ID}) 업데이트...`);
    await prisma.artist.update({
      where: { id: OLD_ARTIST_ID },
      data: {
        name: OLD_ARTIST_DATA.name,
        nameKo: OLD_ARTIST_DATA.nameKo,
      },
    });
    console.log(`  ✓ ${OLD_ARTIST_DATA.name} (${OLD_ARTIST_DATA.nameKo})`);

    // 4.2. 새 아티스트 생성
    console.log(`\n  [2/3] 새 아티스트(${NEW_ARTIST_ID}) 생성...`);
    await prisma.artist.create({
      data: {
        id: NEW_ARTIST_ID,
        name: NEW_ARTIST_DATA.name,
        nameKo: NEW_ARTIST_DATA.nameKo,
      },
    });
    console.log(`  ✓ ${NEW_ARTIST_DATA.name} (${NEW_ARTIST_DATA.nameKo})`);

    // 4.3. ArtistSong 복사
    console.log(`\n  [3/3] 곡 매핑 복사 중...`);
    let copiedCount = 0;

    for (const artistSong of oldArtist.artistSongs) {
      try {
        await prisma.artistSong.create({
          data: {
            artistId: NEW_ARTIST_ID,
            songId: artistSong.songId,
            order: artistSong.order,
            role: artistSong.role,
          },
        });
        copiedCount++;
      } catch (error: any) {
        // 이미 존재하는 경우 무시
        if (!error.message?.includes("Unique constraint")) {
          throw error;
        }
      }
    }

    console.log(`  ✓ ${copiedCount}개 곡 매핑 복사 완료`);
    console.log(`\n  ⚠️  모든 곡이 두 아티스트에게 할당되었습니다.`);
    console.log(`     필요없는 매핑은 수동으로 제거해주세요.`);

    console.log(`\n${"=".repeat(80)}`);
    console.log("✅ 아티스트 분리 완료!");
    console.log(`${"=".repeat(80)}\n`);

    console.log("결과:");
    console.log(`  [${OLD_ARTIST_ID}] ${OLD_ARTIST_DATA.name} (${OLD_ARTIST_DATA.nameKo})`);
    console.log(`  [${NEW_ARTIST_ID}] ${NEW_ARTIST_DATA.name} (${NEW_ARTIST_DATA.nameKo})`);
    console.log(`  각각 ${copiedCount}개 곡 할당됨`);
    console.log();
  } catch (error) {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
