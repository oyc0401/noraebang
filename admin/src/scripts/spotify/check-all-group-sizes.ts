/**
 * 전체 SpotifyTrackGroup의 크기 분포 확인 스크립트
 *
 * 기능:
 * - 모든 그룹의 트랙 개수 분포 확인
 * - 1개짜리 그룹이 실제로 몇 개 있는지 확인
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/check-all-group-sizes.ts
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
  const allGroups = await prisma.spotifyTrackGroup.findMany({
    include: {
      _count: {
        select: {
          tracks: true,
        },
      },
    },
  });

  console.log(`\n📊 전체 그룹 개수: ${allGroups.length}개`);

  const distributionMap = new Map<number, number>();
  for (const group of allGroups) {
    const size = group._count.tracks;
    distributionMap.set(size, (distributionMap.get(size) ?? 0) + 1);
  }

  console.log("\n📊 전체 그룹 크기별 분포:");
  const sortedDistribution = Array.from(distributionMap.entries()).sort(
    (a, b) => a[0] - b[0]
  );
  for (const [size, count] of sortedDistribution) {
    console.log(`   ${size}개 트랙: ${count}개 그룹`);
  }
}

main()
  .catch((e) => {
    console.error("❌ 오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
