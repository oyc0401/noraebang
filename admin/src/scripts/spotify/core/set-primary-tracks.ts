/**
 * 모든 SpotifyTrackGroup의 Primary 트랙 설정 스크립트
 *
 * 동작:
 * 1. 잘못된 primary 정리 (자기 그룹에 속하지 않는 트랙을 가리키는 경우)
 * 2. 트랙이 있는 모든 그룹의 primary를 popularity 기준으로 설정
 * 3. Popularity 높은 순 → releaseDate 최신 순 → id 작은 순
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/core/set-primary-tracks.ts --dry-run
 * pnpm ts-node src/scripts/spotify/core/set-primary-tracks.ts
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

function popularityScore(p: number | null | undefined): number {
  return typeof p === "number" ? p : -1;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    `\n=== SpotifyTrackGroup Primary 트랙 설정 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // Step 1: 잘못된 primary 정리
  console.log("Step 1: 잘못된 primary 정리 중 ...");
  const groupsWithPrimary = await prisma.spotifyTrackGroup.findMany({
    where: {
      primarySpotifyTrackId: { not: null },
    },
    select: {
      id: true,
      primarySpotifyTrackId: true,
      primaryTrack: {
        select: {
          groupId: true,
        },
      },
    },
  });

  let cleanedCount = 0;
  const groupsToClean: number[] = [];

  for (const group of groupsWithPrimary) {
    // primary 트랙이 이 그룹에 속하지 않으면 정리 대상
    if (group.primaryTrack?.groupId !== group.id) {
      groupsToClean.push(group.id);
      cleanedCount++;
    }
  }

  console.log(`✓ 정리 대상: ${cleanedCount}개`);

  if (!isDryRun && groupsToClean.length > 0) {
    await prisma.spotifyTrackGroup.updateMany({
      where: { id: { in: groupsToClean } },
      data: { primarySpotifyTrackId: null },
    });
    console.log(`✓ 정리 완료\n`);
  } else if (isDryRun && groupsToClean.length > 0) {
    console.log(`[DRY RUN] 정리 예정\n`);
  } else {
    console.log(`✓ 정리할 항목 없음\n`);
  }

  // Step 2: 트랙이 있는 모든 그룹 조회
  console.log("Step 2: Primary 트랙 설정 중 ...");
  const allGroups = await prisma.spotifyTrackGroup.findMany({
    where: {
      tracks: {
        some: {},
      },
    },
    select: { id: true, primarySpotifyTrackId: true },
  });

  console.log(`✓ 트랙이 있는 그룹: ${allGroups.length}개\n`);

  if (allGroups.length === 0) {
    console.log("✅ Primary를 설정할 그룹이 없습니다. 종료합니다.");
    return;
  }

  let primaryUpdateCount = 0;
  let alreadyCorrectCount = 0;

  if (isDryRun) {
    // DRY RUN: 샘플만 처리
    console.log("=== DRY RUN 샘플 (처음 10개) ===\n");
    for (const group of allGroups.slice(0, 10)) {
      const tracks = await prisma.spotifyTrack.findMany({
        where: { groupId: group.id },
        select: {
          id: true,
          name: true,
          popularity: true,
          releaseDate: true,
        },
      });

      if (tracks.length === 0) continue;

      const primary = tracks.slice().sort((a, b) => {
        const pa = popularityScore(a.popularity);
        const pb = popularityScore(b.popularity);
        if (pa !== pb) return pb - pa;

        if (a.releaseDate && b.releaseDate) {
          return b.releaseDate.localeCompare(a.releaseDate);
        }
        if (a.releaseDate && !b.releaseDate) return -1;
        if (!a.releaseDate && b.releaseDate) return 1;

        return a.id - b.id;
      })[0]!;

      if (group.primarySpotifyTrackId === primary.id) {
        console.log(
          `그룹[${group.id}] - 이미 올바름: 트랙[${primary.id}] "${primary.name}"`,
        );
      } else {
        console.log(
          `그룹[${group.id}] - 설정 예정: 트랙[${primary.id}] "${primary.name}" (pop: ${primary.popularity})`,
        );
      }
    }
    console.log("\n💡 DRY RUN: 실제 DB 업데이트는 수행하지 않습니다.");
    return;
  }

  // 실제 처리
  for (const group of allGroups) {
    const tracks = await prisma.spotifyTrack.findMany({
      where: { groupId: group.id },
      select: {
        id: true,
        popularity: true,
        releaseDate: true,
      },
    });

    if (tracks.length === 0) continue;

    // Popularity 높은 순, 같으면 최신 순, 같으면 id 작은 순
    const primary = tracks.slice().sort((a, b) => {
      const pa = popularityScore(a.popularity);
      const pb = popularityScore(b.popularity);
      if (pa !== pb) return pb - pa;

      if (a.releaseDate && b.releaseDate) {
        return b.releaseDate.localeCompare(a.releaseDate);
      }
      if (a.releaseDate && !b.releaseDate) return -1;
      if (!a.releaseDate && b.releaseDate) return 1;

      return a.id - b.id;
    })[0]!;

    // 이미 올바른 primary가 설정되어 있으면 스킵
    if (group.primarySpotifyTrackId === primary.id) {
      alreadyCorrectCount++;
      continue;
    }

    await prisma.spotifyTrackGroup.update({
      where: { id: group.id },
      data: { primarySpotifyTrackId: primary.id },
    });
    primaryUpdateCount++;
  }

  console.log(`✓ Primary 설정/업데이트: ${primaryUpdateCount}개`);
  console.log(`✓ 이미 올바름: ${alreadyCorrectCount}개\n`);

  console.log("\n✅ 완료: 모든 그룹의 Primary 트랙이 설정되었습니다.");
}

main()
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 중 오류:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
