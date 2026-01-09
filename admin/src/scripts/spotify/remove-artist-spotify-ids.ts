/**
 * 여러 아티스트의 Spotify ID를 제거하는 스크립트
 *
 * 기능:
 * - 지정된 아티스트들의 spotifyId를 null로 설정
 * - 잘못 매칭된 Spotify 데이터를 정리할 때 사용
 * - SpotifyArtist 레코드는 유지 (다른 아티스트가 사용할 수 있음)
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/remove-artist-spotify-ids.ts --dry-run
 * pnpm ts-node src/scripts/spotify/remove-artist-spotify-ids.ts
 *
 * 주의:
 * - ARTIST_IDS 배열에 제거할 아티스트 ID를 하드코딩해서 사용
 * - --dry-run으로 먼저 확인 후 실행 권장
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
// 여기에 제거할 아티스트 ID를 입력하세요
// ========================================
const ARTIST_IDS = [
  60, // 百足 & 韻マン (잘못 매칭: Yuuri/優里)
  71, // BAK (잘못 매칭: back number)
  131, // ASA (잘못 매칭: A$AP Rocky)
  139, // AiRI (잘못 매칭: AIRI KANNA)
  148, // ALI (잘못 매칭: Alice In Chains)
  153, // Yumcha (잘못 매칭: Yunchan Lim)
  154, // 808 (잘못 매칭: 808 State)
  160, // HY (잘못 매칭: HYBS)
  166, // 織重 夕 (잘못 매칭: 阿悠悠)
  178, // ヨーメイ (잘못 매칭: Yomiuri Nippon Symphony Orchestra)
];

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n=== Spotify ID 제거 스크립트 ${isDryRun ? "(DRY RUN)" : ""} ===\n`);

  if (ARTIST_IDS.length === 0) {
    console.log("⚠️  ARTIST_IDS 배열이 비어있습니다.");
    console.log("스크립트 파일을 열어서 제거할 아티스트 ID를 입력해주세요.\n");
    return;
  }

  console.log(`대상 아티스트 ID: ${ARTIST_IDS.join(", ")}\n`);

  // 1. 아티스트 정보 조회
  console.log("Step 1: 아티스트 정보 조회 중...");
  const artists = await prisma.artist.findMany({
    where: {
      id: { in: ARTIST_IDS },
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`✓ ${artists.length}개 아티스트 조회 완료\n`);

  if (artists.length === 0) {
    console.log("⚠️  조회된 아티스트가 없습니다.\n");
    return;
  }

  // 2. 현재 상태 출력
  console.log("현재 상태:");
  console.log("─".repeat(80));
  for (const artist of artists) {
    const status = artist.spotifyId ? `✓ ${artist.spotifyId}` : "✗ (없음)";
    console.log(`ID ${artist.id.toString().padEnd(5)} | ${artist.name.padEnd(30)} | ${status}`);
  }
  console.log("─".repeat(80));
  console.log();

  // 3. Spotify ID가 있는 아티스트만 필터링
  const artistsWithSpotifyId = artists.filter((a) => a.spotifyId);

  if (artistsWithSpotifyId.length === 0) {
    console.log("⚠️  Spotify ID가 설정된 아티스트가 없습니다.\n");
    return;
  }

  console.log(`${artistsWithSpotifyId.length}개 아티스트의 Spotify ID를 제거합니다.\n`);

  // 4. Spotify ID 제거
  if (!isDryRun) {
    console.log("Step 2: Spotify ID 제거 중...");

    let successCount = 0;
    let errorCount = 0;

    for (const artist of artistsWithSpotifyId) {
      try {
        await prisma.artist.update({
          where: { id: artist.id },
          data: { spotifyId: null },
        });
        console.log(`  ✓ ID ${artist.id} (${artist.name}): Spotify ID 제거 완료`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ ID ${artist.id} (${artist.name}): 실패 -`, error);
        errorCount++;
      }
    }

    console.log();
    console.log("=== 결과 ===");
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);

    if (errorCount === 0) {
      console.log(`\n✅ 모든 아티스트의 Spotify ID가 제거되었습니다!`);
    }
  } else {
    console.log("💡 DRY RUN 모드: 실제 변경은 수행되지 않았습니다.");
    console.log(`💡 실제 제거를 수행하려면 --dry-run 없이 다시 실행하세요.\n`);
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
