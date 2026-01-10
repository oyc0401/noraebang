/**
 * musicBrainzRecordingId가 없는 SpotifyTrack 중 그룹에 속한 트랙 분석 스크립트
 *
 * 기능:
 * - musicBrainzRecordingId가 null인 트랙 중 groupId가 있는 트랙 조회
 * - 해당 트랙들이 속한 그룹의 전체 트랙 수 분석
 * - 해당 트랙 혼자만 있는 그룹(트랙 1개) 개수 집계
 *
 * 출력:
 * 1. musicBrainzRecordingId 없으면서 그룹에 들어있는 트랙 개수
 * 2. 해당 트랙 혼자만 있는 그룹 개수
 * 3. 그룹별 상세 정보 (전체 트랙 수 / musicBrainzRecordingId 없는 트랙 수)
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/check-tracks-without-musicbrainz.ts
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
  // musicBrainzRecordingId가 없고 groupId가 있는 트랙들 조회
  const tracksWithoutMusicBrainz = await prisma.spotifyTrack.findMany({
    where: {
      musicBrainzRecordingId: null,
      groupId: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      groupId: true,
    },
  });

  console.log(
    `\n📊 musicBrainzRecordingId가 없으면서 그룹에 들어있는 트랙 개수: ${tracksWithoutMusicBrainz.length}개`,
  );

  if (tracksWithoutMusicBrainz.length === 0) {
    console.log("\n✅ 조건에 해당하는 트랙이 없습니다.");
    return;
  }

  // 그룹별로 묶기
  const groupMap = new Map<number, number>();
  for (const track of tracksWithoutMusicBrainz) {
    const groupId = track.groupId!;
    groupMap.set(groupId, (groupMap.get(groupId) ?? 0) + 1);
  }

  // 각 그룹의 실제 트랙 개수 확인
  const groupIds = Array.from(groupMap.keys());
  const groups = await prisma.spotifyTrackGroup.findMany({
    where: {
      id: {
        in: groupIds,
      },
    },
    include: {
      _count: {
        select: {
          tracks: true,
        },
      },
    },
  });

  // 해당 트랙만 있는 그룹 (그룹 내 모든 트랙이 musicBrainzRecordingId가 없는 경우) 찾기
  const soloGroups: number[] = [];
  for (const group of groups) {
    const totalTracksInGroup = group._count.tracks;
    const tracksWithoutMbInGroup = groupMap.get(group.id) ?? 0;

    // 그룹의 모든 트랙이 musicBrainzRecordingId가 없는 경우
    if (
      totalTracksInGroup === tracksWithoutMbInGroup &&
      totalTracksInGroup === 1
    ) {
      soloGroups.push(group.id);
    }
  }

  console.log(`🔍 해당 트랙 혼자만 있는 그룹 개수: ${soloGroups.length}개`);

  // 그룹 통계 계산 (퍼센트 포함)
  const groupStats = groups
    .map((group) => ({
      groupId: group.id,
      totalTracks: group._count.tracks,
      tracksWithoutMb: groupMap.get(group.id) ?? 0,
      percentage: ((groupMap.get(group.id) ?? 0) / group._count.tracks) * 100,
    }))
    .sort((a, b) => {
      // 퍼센트 내림차순 정렬, 같으면 전체 트랙 수 내림차순
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return b.totalTracks - a.totalTracks;
    });

  // 그룹 크기별 분포 계산
  const distributionMap = new Map<number, number>();
  for (const stat of groupStats) {
    const size = stat.totalTracks;
    distributionMap.set(size, (distributionMap.get(size) ?? 0) + 1);
  }

  console.log("\n📊 그룹 크기별 분포 (전체 트랙 개수별 그룹 수):");
  const sortedDistribution = Array.from(distributionMap.entries()).sort(
    (a, b) => a[0] - b[0],
  );
  for (const [size, count] of sortedDistribution) {
    console.log(`   ${size}개 트랙: ${count}개 그룹`);
  }

  // 100% 그룹 확인 및 트랙 개수 많은 순으로 정렬
  const fullGroups = groupStats
    .filter((stat) => stat.percentage === 100)
    .sort((a, b) => b.totalTracks - a.totalTracks);

  console.log(
    `\n📊 100% 그룹 (전체 트랙이 musicBrainzRecordingId 없음): ${fullGroups.length}개`,
  );

  console.log(`\n📋 상위 10개 (100% 그룹 중 트랙 개수 많은 순):`);
  console.log("[그룹ID] id없는 트랙수 / 전체 트랙수");

  const top10 = fullGroups.slice(0, 10);

  for (const stat of top10) {
    const isSolo = stat.totalTracks === 1 && stat.tracksWithoutMb === 1;
    const marker = isSolo ? "⭐" : "  ";
    console.log(
      `${marker} [${stat.groupId}] ${stat.tracksWithoutMb}개 / ${stat.totalTracks}개`,
    );
  }

  if (top10.length > 0) {
    console.log(`\n💡 100% 그룹 ${fullGroups.length}개 중 상위 10개 표시`);
  }
  if (soloGroups.length > 0) {
    console.log("⭐ = 혼자만 있는 그룹");
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
