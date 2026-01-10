/**
 * 재매핑 결과 검증 스크립트
 *
 * pnpm ts-node src/scripts/artist/verify-remapping.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

async function main() {
  console.log("🔍 재매핑 결과를 검증합니다...\n");

  // 샘플 케이스 확인
  const testCases = [
    { id: 4840, name: "4MEN&박정은", expectedArtists: ["4MEN", "박정은"] },
    {
      id: 5346,
      name: "브라운아이드걸스&씨야",
      expectedArtists: ["브라운아이드걸스", "더 씨야"],
    },
    {
      id: 7654,
      name: "김종국&SG워너비",
      expectedArtists: ["김종국", "SG워너비"],
    },
    { id: 8152, name: "리쌍&에픽하이", expectedArtists: ["리쌍", "에픽하이"] },
  ];

  for (const testCase of testCases) {
    const collabArtist = await prisma.artist.findUnique({
      where: { id: testCase.id },
      select: {
        id: true,
        name: true,
        nameKo: true,
        _count: {
          select: { artistSongs: true },
        },
      },
    });

    if (!collabArtist) {
      console.log(`❌ ${testCase.name} 아티스트를 찾을 수 없습니다.`);
      continue;
    }

    console.log(
      `\n📌 ${collabArtist.nameKo || collabArtist.name} (ID: ${collabArtist.id})`,
    );
    console.log(`   현재 곡 수: ${collabArtist._count.artistSongs}개`);

    if (collabArtist._count.artistSongs === 0) {
      console.log(`   ✅ 협업 아티스트의 매핑이 모두 제거되었습니다.`);
    } else {
      console.log(
        `   ⚠️  아직 ${collabArtist._count.artistSongs}개의 곡이 남아있습니다.`,
      );
    }

    // 예상되는 개별 아티스트들 확인
    for (const expectedName of testCase.expectedArtists) {
      const artist = await prisma.artist.findFirst({
        where: {
          OR: [
            { name: { contains: expectedName } },
            { nameKo: { contains: expectedName } },
          ],
        },
        select: {
          id: true,
          name: true,
          nameKo: true,
          _count: {
            select: { artistSongs: true },
          },
        },
      });

      if (artist) {
        console.log(
          `   → ${artist.nameKo || artist.name}: ${artist._count.artistSongs}개 곡`,
        );
      }
    }
  }

  // 전체 통계
  console.log("\n\n📊 전체 통계:");

  const collaborationArtistsWithNoSongs = await prisma.artist.count({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: "&" } },
            { name: { contains: "with" } },
            { name: { contains: "X" } },
            { name: { contains: "feat" } },
            { nameKo: { contains: "&" } },
            { nameKo: { contains: "with" } },
            { nameKo: { contains: "X" } },
            { nameKo: { contains: "feat" } },
          ],
        },
        {
          artistSongs: {
            none: {},
          },
        },
      ],
    },
  });

  console.log(
    `   곡이 0개인 협업 아티스트: ${collaborationArtistsWithNoSongs}명`,
  );

  const collaborationArtistsWithFewSongs = await prisma.artist.count({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: "&" } },
            { name: { contains: "with" } },
            { name: { contains: "X" } },
            { name: { contains: "feat" } },
            { nameKo: { contains: "&" } },
            { nameKo: { contains: "with" } },
            { nameKo: { contains: "X" } },
            { nameKo: { contains: "feat" } },
          ],
        },
      ],
    },
  });

  console.log(
    `   전체 협업 키워드 아티스트: ${collaborationArtistsWithFewSongs}명`,
  );
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
