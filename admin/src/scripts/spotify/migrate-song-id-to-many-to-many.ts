/**
 * SpotifyTrack.songId를 SongSpotifyTrack 다대다 테이블로 마이그레이션하는 스크립트
 *
 * 기능:
 * - SpotifyTrack에 songId가 있는 레코드를 조회
 * - SongSpotifyTrack 테이블에 해당 관계를 삽입
 * - 기존 songId 컬럼은 유지 (삭제하지 않음)
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/migrate-song-id-to-many-to-many.ts --dry-run
 * pnpm ts-node src/scripts/spotify/migrate-song-id-to-many-to-many.ts
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
    console.log("🔍 [DRY RUN MODE] 실제 DB 변경은 수행하지 않습니다.\n");
  }

  console.log("📊 songId가 있는 SpotifyTrack을 검색합니다...\n");

  // songId가 있는 SpotifyTrack 조회
  const tracksWithSong = await prisma.spotifyTrack.findMany({
    where: {
      songId: {
        not: null,
      },
    },
    select: {
      id: true,
      songId: true,
      name: true,
    },
  });

  if (tracksWithSong.length === 0) {
    console.log("✅ 마이그레이션할 레코드가 없습니다.");
    return;
  }

  console.log(`✅ songId가 있는 트랙: ${tracksWithSong.length}개 발견\n`);

  // 이미 SongSpotifyTrack에 있는 관계 확인
  const existingRelations = await prisma.songSpotifyTrack.findMany({
    select: {
      songId: true,
      spotifyTrackId: true,
    },
  });

  const existingSet = new Set(
    existingRelations.map((r) => `${r.songId}-${r.spotifyTrackId}`)
  );

  console.log(`📊 기존 SongSpotifyTrack 레코드: ${existingRelations.length}개\n`);

  // 새로 추가해야 할 관계 필터링
  const toInsert = tracksWithSong.filter(
    (track) => !existingSet.has(`${track.songId}-${track.id}`)
  );

  if (toInsert.length === 0) {
    console.log("✅ 모든 관계가 이미 마이그레이션되어 있습니다.");
    return;
  }

  console.log(`📝 새로 추가할 관계: ${toInsert.length}개\n`);

  if (isDryRun) {
    console.log("🔍 [DRY RUN] 추가될 관계 샘플 (최대 10개):");
    toInsert.slice(0, 10).forEach((track) => {
      console.log(
        `  - SpotifyTrack ${track.id} (${track.name}) → Song ${track.songId}`
      );
    });
    if (toInsert.length > 10) {
      console.log(`  ... 외 ${toInsert.length - 10}개`);
    }
    console.log(`\n✅ [DRY RUN] 총 ${toInsert.length}개의 관계가 추가될 예정입니다.`);
    return;
  }

  // 배치로 삽입
  const BATCH_SIZE = 1000;
  let insertedCount = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const progress = `[${Math.min(i + BATCH_SIZE, toInsert.length)}/${toInsert.length}]`;

    await prisma.songSpotifyTrack.createMany({
      data: batch.map((track) => ({
        songId: track.songId as number,
        spotifyTrackId: track.id,
      })),
      skipDuplicates: true,
    });

    insertedCount += batch.length;
    console.log(`${progress} ${batch.length}개 삽입 완료`);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 마이그레이션 결과");
  console.log(`  ✅ 삽입된 관계: ${insertedCount}개`);
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
