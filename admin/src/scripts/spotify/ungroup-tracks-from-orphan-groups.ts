/**
 * Song 연결이 없는 SpotifyTrackGroup에서 트랙을 제거하는 스크립트
 *
 * 동작:
 * - Song이 연결되지 않은 SpotifyTrackGroup 조회
 * - 해당 그룹에 속한 SpotifyTrack의 groupId를 null로 설정
 * - primarySpotifyTrackId도 null로 초기화
 * - dry-run 모드 지원
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/ungroup-tracks-from-orphan-groups.ts
 * pnpm ts-node src/scripts/spotify/ungroup-tracks-from-orphan-groups.ts --dry-run
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
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE] 실제 DB 업데이트는 수행하지 않습니다.\n");
  }

  console.log("📊 Song 연결이 없는 SpotifyTrackGroup을 검색합니다...\n");

  const orphanGroups = await prisma.spotifyTrackGroup.findMany({
    where: {
      songs: {
        none: {},
      },
      tracks: {
        some: {},
      },
    },
    select: {
      id: true,
      primarySpotifyTrackId: true,
      createdAt: true,
      tracks: {
        select: {
          id: true,
          name: true,
          spotifyId: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  if (orphanGroups.length === 0) {
    console.log("✅ Song 연결이 없는 그룹이 없습니다.");
    return;
  }

  console.log(`✅ Song 연결 없는 그룹: ${orphanGroups.length}개 발견\n`);

  let processedGroupCount = 0;
  let ungroupedTrackCount = 0;
  let primaryClearedCount = 0;

  for (let i = 0; i < orphanGroups.length; i++) {
    const group = orphanGroups[i];
    const progress = `[${i + 1}/${orphanGroups.length}]`;

    console.log(`${progress} 그룹 ID: ${group.id}`);
    console.log(`     생성일: ${group.createdAt.toISOString()}`);
    console.log(`     트랙 수: ${group.tracks.length}`);

    if (group.tracks.length > 0) {
      group.tracks.slice(0, 3).forEach((track) => {
        console.log(`       - Track ID ${track.id}: ${track.name}`);
      });
      if (group.tracks.length > 3) {
        console.log(`       ... 외 ${group.tracks.length - 3}개`);
      }
    }

    const hasPrimary = group.primarySpotifyTrackId !== null;
    if (hasPrimary) {
      console.log(`     ⚠️  primary 트랙 ID: ${group.primarySpotifyTrackId}`);
    }

    if (isDryRun) {
      console.log(
        `     🔍 [DRY RUN] ${hasPrimary ? "primary 해제 및 " : ""}${group.tracks.length}개 트랙 그룹 해제 예정\n`,
      );
      processedGroupCount++;
      ungroupedTrackCount += group.tracks.length;
      if (hasPrimary) {
        primaryClearedCount++;
      }
      continue;
    }

    // primary 해제
    if (hasPrimary) {
      await prisma.spotifyTrackGroup.update({
        where: { id: group.id },
        data: { primarySpotifyTrackId: null },
      });
      primaryClearedCount++;
    }

    // 트랙들의 groupId 해제
    const trackIds = group.tracks.map((t) => t.id);
    await prisma.spotifyTrack.updateMany({
      where: { id: { in: trackIds } },
      data: { groupId: null },
    });

    console.log(`     ✅ ${group.tracks.length}개 트랙 그룹 해제 완료\n`);
    processedGroupCount++;
    ungroupedTrackCount += group.tracks.length;
  }

  console.log(`${"=".repeat(50)}`);
  console.log("📊 실행 결과");
  console.log(`  📁 처리된 그룹: ${processedGroupCount}`);
  console.log(`  🔓 그룹 해제된 트랙: ${ungroupedTrackCount}`);
  console.log(`  ⚠️  primary 초기화된 그룹: ${primaryClearedCount}`);
  console.log(`${"=".repeat(50)}\n`);
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
