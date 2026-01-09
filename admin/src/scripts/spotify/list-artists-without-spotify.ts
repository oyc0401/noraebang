/**
 * ID가 272 이하인 아티스트 중 Spotify ID가 없는 아티스트 출력 스크립트
 *
 * 기능:
 * - artistId <= 272인 아티스트 중 spotifyId가 null인 아티스트 조회
 * - 아티스트 정보를 테이블 형식으로 출력
 * - 수기로 Spotify ID를 입력해야 할 아티스트 목록 확인용
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/list-artists-without-spotify.ts
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
  console.log(`\n=== Spotify ID가 없는 아티스트 조회 (ID <= 272) ===\n`);

  // 아티스트 조회
  const artists = await prisma.artist.findMany({
    where: {
      id: { lte: 272 },
      spotifyId: null,
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
      slug: true,
      homeCatalog: true,
      _count: {
        select: {
          artistSongs: true,
          youtubeChannels: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`총 ${artists.length}개 아티스트가 Spotify ID가 없습니다.\n`);

  if (artists.length === 0) {
    console.log("✅ 모든 아티스트에 Spotify ID가 설정되어 있습니다!\n");
    return;
  }

  // 테이블 헤더
  console.log("─".repeat(100));
  console.log(
    `${"ID".padEnd(5)} | ${"Name".padEnd(35)} | ${"NameKo".padEnd(25)} | ${"Songs".padEnd(6)} | ${"Catalog".padEnd(8)}`
  );
  console.log("─".repeat(100));

  // 아티스트 목록 출력
  for (const artist of artists) {
    const id = artist.id.toString().padEnd(5);
    const name = (artist.name || "").padEnd(35).substring(0, 35);
    const nameKo = (artist.nameKo || "").padEnd(25).substring(0, 25);
    const songs = artist._count.artistSongs.toString().padEnd(6);
    const catalog = (artist.homeCatalog || "-").padEnd(8);

    console.log(`${id} | ${name} | ${nameKo} | ${songs} | ${catalog}`);
  }

  console.log("─".repeat(100));
  console.log();

  // 통계
  const byCatalog = artists.reduce(
    (acc, artist) => {
      const catalog = artist.homeCatalog || "없음";
      acc[catalog] = (acc[catalog] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("📊 카탈로그별 통계:");
  for (const [catalog, count] of Object.entries(byCatalog).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${catalog.padEnd(10)}: ${count}개`);
  }

  console.log();
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
