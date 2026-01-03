/**
 * 문제가 될 만한 아티스트들을 분석하는 스크립트
 *
 * pnpm ts-node src/scripts/artist/analyze-problematic-artists.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const COLLABORATION_KEYWORDS = ["with", "&", "X", "feat", "featuring", "ft", "duet", "Duet"];

async function main() {
  console.log("🔍 문제가 될 만한 아티스트들을 분석합니다...\n");

  // 1. 협업 키워드가 포함된 아티스트 중 곡이 있는 것들
  console.log("=" .repeat(80));
  console.log("1. 협업 키워드 포함 아티스트 (곡이 1개 이상)");
  console.log("=" .repeat(80) + "\n");

  const artists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
      nameKo: true,
      _count: {
        select: { artistSongs: true },
      },
    },
    orderBy: { id: "asc" },
  });

  const collaborationArtists = artists.filter((artist) => {
    const searchText = [artist.name, artist.nameKo].join(" ");
    return (
      COLLABORATION_KEYWORDS.some((keyword) =>
        searchText.toLowerCase().includes(keyword.toLowerCase())
      ) && artist._count.artistSongs > 0
    );
  });

  console.log(`총 ${collaborationArtists.length}명의 협업 아티스트\n`);

  // 곡이 적은 순으로 정렬
  collaborationArtists.sort((a, b) => a._count.artistSongs - b._count.artistSongs);

  // 곡이 10개 이하인 것만 출력
  const fewSongsArtists = collaborationArtists.filter((a) => a._count.artistSongs <= 10);

  console.log(`곡이 10개 이하인 협업 아티스트: ${fewSongsArtists.length}명\n`);

  for (const artist of fewSongsArtists.slice(0, 50)) {
    console.log(
      `ID: ${artist.id.toString().padStart(5)} | 곡: ${artist._count.artistSongs.toString().padStart(2)} | ${artist.nameKo || artist.name}`
    );
  }

  // 2. 대소문자만 다른 중복 아티스트
  console.log("\n" + "=".repeat(80));
  console.log("2. 대소문자 중복 가능성이 있는 아티스트");
  console.log("=".repeat(80) + "\n");

  const duplicateGroups = new Map<string, typeof artists>();

  for (const artist of artists) {
    const key = (artist.nameKo || artist.name).toLowerCase();
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key)?.push(artist);
  }

  const duplicates = Array.from(duplicateGroups.entries())
    .filter(([_, group]) => group.length > 1)
    .map(([key, group]) => ({ key, group }));

  console.log(`대소문자가 다른 중복 그룹: ${duplicates.length}개\n`);

  for (const { key, group } of duplicates.slice(0, 30)) {
    console.log(`\n그룹: "${key}"`);
    for (const artist of group) {
      console.log(
        `  ID: ${artist.id.toString().padStart(5)} | 곡: ${artist._count.artistSongs.toString().padStart(3)} | name: "${artist.name}" | nameKo: "${artist.nameKo || "-"}"`
      );
    }
  }
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
