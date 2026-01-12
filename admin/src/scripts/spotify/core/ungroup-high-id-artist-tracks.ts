/**
 * artistId가 300 이상인 아티스트들의 SpotifyTrack을 그룹에서 제거하는 스크립트
 *
 * 동작:
 * 1. artist.id >= 300인 아티스트들의 spotifyId 조회
 * 2. 해당 spotifyId로 SpotifyArtist 찾기
 * 3. SpotifyArtistTrack으로 해당 아티스트의 트랙들 찾기
 * 4. 트랙들의 groupId를 null로 설정 (그룹에서 제거)
 *
 * 주의:
 * - SpotifyTrackGroup 자체는 삭제하지 않음 (다른 아티스트 트랙이 있을 수 있음)
 * - Song 매핑은 그대로 유지됨
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/core/ungroup-high-id-artist-tracks.ts --dry-run
 * pnpm ts-node src/scripts/spotify/core/ungroup-high-id-artist-tracks.ts
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
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    `\n=== artistId >= 300인 아티스트의 트랙 그룹 해제 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1) artist.id >= 300인 아티스트 조회
  console.log("Step 1: artist.id >= 300인 아티스트 조회 중 ...");
  const artists = await prisma.artist.findMany({
    where: {
      id: { gte: 300 },
      spotifyId: { not: null },
    },
    select: { id: true, name: true, spotifyId: true },
    orderBy: { id: "asc" },
  });

  const spotifyIds = artists
    .map((a) => a.spotifyId)
    .filter(Boolean) as string[];

  console.log(
    `✓ artists: ${artists.length}명, spotifyId 보유: ${spotifyIds.length}명\n`,
  );

  if (spotifyIds.length === 0) {
    console.log("✅ spotifyId 보유 아티스트가 없습니다. 종료합니다.");
    return;
  }

  // 2) spotifyId로 SpotifyArtist 찾기
  console.log("Step 2: SpotifyArtist 매핑 조회 중 ...");
  const spotifyArtists = await prisma.spotifyArtist.findMany({
    where: { spotifyId: { in: spotifyIds } },
    select: { id: true, spotifyId: true, name: true },
  });

  const spotifyArtistIds = spotifyArtists.map((sa) => sa.id);

  console.log(`✓ SpotifyArtist found: ${spotifyArtists.length}개\n`);

  if (spotifyArtistIds.length === 0) {
    console.log("✅ 매핑된 SpotifyArtist가 없습니다. 종료합니다.");
    return;
  }

  // 3) 대상 트랙 수 조회 (미리보기용)
  console.log("Step 3: 대상 트랙 수 조회 중 ...");
  const trackCount = await prisma.spotifyTrack.count({
    where: {
      artists: {
        some: {
          spotifyArtistId: { in: spotifyArtistIds },
        },
      },
      groupId: { not: null },
    },
  });

  console.log(`✓ 그룹 해제 대상 트랙: ${trackCount}개\n`);

  if (trackCount === 0) {
    console.log("✅ 그룹 해제할 트랙이 없습니다. 종료합니다.");
    return;
  }

  if (isDryRun) {
    // DRY RUN: 샘플 트랙 조회
    const sampleTracks = await prisma.spotifyTrack.findMany({
      where: {
        artists: {
          some: {
            spotifyArtistId: { in: spotifyArtistIds },
          },
        },
        groupId: { not: null },
      },
      select: {
        id: true,
        name: true,
        groupId: true,
      },
      take: 10,
    });

    console.log("=== DRY RUN 샘플 (처음 10개) ===\n");
    for (const track of sampleTracks) {
      console.log(
        `트랙[${track.id}] "${track.name}" - 그룹[${track.groupId}]에서 제거 예정`,
      );
    }
    console.log("\n💡 DRY RUN: 실제 DB 업데이트는 수행하지 않습니다.");
    return;
  }

  // 4) groupId를 null로 설정 (관계 필터링 사용)
  console.log("Step 4: 트랙 그룹 해제 중 ...");

  const result = await prisma.spotifyTrack.updateMany({
    where: {
      artists: {
        some: {
          spotifyArtistId: { in: spotifyArtistIds },
        },
      },
      groupId: { not: null },
    },
    data: { groupId: null },
  });

  console.log(`✓ 그룹 해제된 트랙: ${result.count}개\n`);

  console.log(
    "\n✅ 완료: artistId >= 300인 아티스트의 트랙들이 그룹에서 제거되었습니다.",
  );
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
