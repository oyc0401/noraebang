/**
 * SpotifyTrackGroup → songId 마이그레이션 스크립트
 *
 * 기능:
 * - SpotifyTrack.groupId가 있는 트랙들 조회
 * - 해당 그룹(SpotifyTrackGroup)이 Song과 연결되어 있는지 확인
 * - 연결되어 있으면 SpotifyTrack.songId에 해당 Song.id 설정
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/migrate-group-to-song-id.ts
 * pnpm ts-node src/scripts/spotify/migrate-group-to-song-id.ts --dry-run
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

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`\n=== SpotifyTrackGroup → songId 마이그레이션 ===`);
  if (dryRun) console.log(`🔍 DRY-RUN MODE\n`);

  // 1. Song과 연결된 SpotifyTrackGroup 조회
  const songsWithGroup = await prisma.song.findMany({
    where: {
      spotifyTrackGroupId: { not: null },
    },
    select: {
      id: true,
      title: true,
      spotifyTrackGroupId: true,
    },
  });

  console.log(`Song과 연결된 그룹: ${songsWithGroup.length}개\n`);

  if (songsWithGroup.length === 0) {
    console.log("✅ 마이그레이션할 데이터가 없습니다.\n");
    return;
  }

  // groupId → songId 매핑 생성
  const groupIdToSongId = new Map<
    number,
    { songId: number; songTitle: string }
  >();
  for (const song of songsWithGroup) {
    if (song.spotifyTrackGroupId) {
      groupIdToSongId.set(song.spotifyTrackGroupId, {
        songId: song.id,
        songTitle: song.title,
      });
    }
  }

  // 2. groupId가 있고 songId가 null인 트랙들 조회
  const tracksToMigrate = await prisma.spotifyTrack.findMany({
    where: {
      groupId: { not: null },
      songId: null,
    },
    select: {
      id: true,
      name: true,
      groupId: true,
    },
  });

  console.log(`마이그레이션 대상 트랙: ${tracksToMigrate.length}개\n`);

  if (tracksToMigrate.length === 0) {
    console.log("✅ 이미 모든 트랙이 마이그레이션 완료되었습니다.\n");
    return;
  }

  // 3. 마이그레이션 실행
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  // 배치 처리를 위해 그룹별로 모으기
  const tracksByGroupId = new Map<number, number[]>();
  for (const track of tracksToMigrate) {
    if (track.groupId) {
      const list = tracksByGroupId.get(track.groupId) ?? [];
      list.push(track.id);
      tracksByGroupId.set(track.groupId, list);
    }
  }

  for (const [groupId, trackIds] of tracksByGroupId) {
    const songData = groupIdToSongId.get(groupId);

    if (!songData) {
      // 이 그룹은 Song과 연결되어 있지 않음
      skipped += trackIds.length;
      continue;
    }

    try {
      if (dryRun) {
        console.log(
          `[DRY-RUN] Group ${groupId} → Song ${songData.songId} ("${songData.songTitle}"): ${trackIds.length}트랙`,
        );
      } else {
        await prisma.spotifyTrack.updateMany({
          where: { id: { in: trackIds } },
          data: { songId: songData.songId },
        });
        // console.log(
        //   `✅ Group ${groupId} → Song ${songData.songId} ("${songData.songTitle}"): ${trackIds.length}트랙`,
        // );
      }
      migrated += trackIds.length;
    } catch (error) {
      console.error(
        `❌ Group ${groupId} 마이그레이션 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      errors += trackIds.length;
    }
  }

  console.log(`\n=== 결과 ===`);
  console.log(`마이그레이션: ${migrated}개`);
  console.log(`스킵 (Song 미연결 그룹): ${skipped}개`);
  console.log(`오류: ${errors}개`);

  if (dryRun) {
    console.log(`\n🔍 DRY-RUN: 실제 DB 변경은 없습니다.`);
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
