/**
 * JSON 파일에 정의된 아티스트 매핑 작업을 실행하는 스크립트
 *
 * pnpm ts-node src/scripts/artist/execute-mapping-operations.ts
 * pnpm ts-node src/scripts/artist/execute-mapping-operations.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const isDryRun = process.argv.includes("--dry-run");

type CopySongsAndDeleteOperation = {
  type: "copy_songs_and_delete";
  description: string;
  fromArtistId: number;
  toArtistIds: number[];
  note?: string;
};

type MergeArtistsOperation = {
  type: "merge_artists";
  description: string;
  fromArtistId: number;
  toArtistId: number;
  note?: string;
};

type Operation = CopySongsAndDeleteOperation | MergeArtistsOperation;

type OperationsFile = {
  operations: Operation[];
};

async function copySongsAndDelete(op: CopySongsAndDeleteOperation) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📋 작업: ${op.description}`);
  console.log(`   ${op.note || ""}`);
  console.log(`${"=".repeat(80)}\n`);

  // fromArtist 정보
  const fromArtist = await prisma.artist.findUnique({
    where: { id: op.fromArtistId },
    include: {
      _count: {
        select: { artistSongs: true },
      },
    },
  });

  if (!fromArtist) {
    console.log(`❌ fromArtist (ID: ${op.fromArtistId})를 찾을 수 없습니다.`);
    return;
  }

  console.log(
    `   FROM: ${fromArtist.nameKo || fromArtist.name} (ID: ${fromArtist.id}, 곡: ${fromArtist._count.artistSongs}개)`,
  );

  // toArtists 정보
  const toArtists = await prisma.artist.findMany({
    where: { id: { in: op.toArtistIds } },
    include: {
      _count: {
        select: { artistSongs: true },
      },
    },
  });

  for (const artist of toArtists) {
    console.log(
      `   TO:   ${artist.nameKo || artist.name} (ID: ${artist.id}, 곡: ${artist._count.artistSongs}개)`,
    );
  }

  // fromArtist의 곡들 가져오기
  const songs = await prisma.artistSong.findMany({
    where: { artistId: op.fromArtistId },
    select: { songId: true, role: true },
  });

  console.log(`\n   📦 복사할 곡: ${songs.length}개`);

  if (!isDryRun) {
    await prisma.$transaction(async (tx) => {
      let copiedCount = 0;
      let skippedCount = 0;

      for (const song of songs) {
        for (const toArtist of toArtists) {
          // 이미 매핑이 있는지 확인
          const existing = await tx.artistSong.findUnique({
            where: {
              artistId_songId: {
                artistId: toArtist.id,
                songId: song.songId,
              },
            },
          });

          if (!existing) {
            await tx.artistSong.create({
              data: {
                artistId: toArtist.id,
                songId: song.songId,
                order: song.order,
                role: song.role,
              },
            });
            copiedCount++;
          } else {
            skippedCount++;
          }
        }
      }

      // fromArtist의 매핑 모두 삭제
      await tx.artistSong.deleteMany({
        where: { artistId: op.fromArtistId },
      });

      console.log(`   ✅ ${copiedCount}개 곡 매핑 복사 완료`);
      console.log(`   ⏭️  ${skippedCount}개 곡 이미 매핑되어 스킵`);
      console.log(`   🗑️  fromArtist의 매핑 삭제 완료`);
    });
  } else {
    console.log(`   ⚠️  DRY RUN: 실제 작업은 수행되지 않습니다.`);
  }
}

async function mergeArtists(op: MergeArtistsOperation) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📋 작업: ${op.description}`);
  console.log(`   ${op.note || ""}`);
  console.log(`${"=".repeat(80)}\n`);

  // fromArtist 정보
  const fromArtist = await prisma.artist.findUnique({
    where: { id: op.fromArtistId },
    include: {
      _count: {
        select: { artistSongs: true },
      },
    },
  });

  if (!fromArtist) {
    console.log(`❌ fromArtist (ID: ${op.fromArtistId})를 찾을 수 없습니다.`);
    return;
  }

  // toArtist 정보
  const toArtist = await prisma.artist.findUnique({
    where: { id: op.toArtistId },
    include: {
      _count: {
        select: { artistSongs: true },
      },
    },
  });

  if (!toArtist) {
    console.log(`❌ toArtist (ID: ${op.toArtistId})를 찾을 수 없습니다.`);
    return;
  }

  console.log(
    `   FROM: ${fromArtist.nameKo || fromArtist.name} (ID: ${fromArtist.id}, 곡: ${fromArtist._count.artistSongs}개)`,
  );
  console.log(
    `   TO:   ${toArtist.nameKo || toArtist.name} (ID: ${toArtist.id}, 곡: ${toArtist._count.artistSongs}개)`,
  );

  // fromArtist의 곡들 가져오기
  const songs = await prisma.artistSong.findMany({
    where: { artistId: op.fromArtistId },
    select: { songId: true, role: true },
  });

  console.log(`\n   📦 병합할 곡: ${songs.length}개`);

  if (!isDryRun) {
    await prisma.$transaction(async (tx) => {
      let copiedCount = 0;
      let skippedCount = 0;

      for (const song of songs) {
        // 이미 매핑이 있는지 확인
        const existing = await tx.artistSong.findUnique({
          where: {
            artistId_songId: {
              artistId: toArtist.id,
              songId: song.songId,
            },
          },
        });

        if (!existing) {
          await tx.artistSong.create({
            data: {
              artistId: toArtist.id,
              songId: song.songId,
              order: song.order,
              role: song.role,
            },
          });
          copiedCount++;
        } else {
          skippedCount++;
        }
      }

      // fromArtist의 매핑 모두 삭제
      await tx.artistSong.deleteMany({
        where: { artistId: op.fromArtistId },
      });

      // fromArtist 삭제 (YoutubeChannel도 CASCADE로 삭제됨)
      await tx.artist.delete({
        where: { id: op.fromArtistId },
      });

      console.log(`   ✅ ${copiedCount}개 곡 매핑 병합 완료`);
      console.log(`   ⏭️  ${skippedCount}개 곡 이미 매핑되어 스킵`);
      console.log(`   🗑️  fromArtist 완전 삭제 완료`);
    });
  } else {
    console.log(`   ⚠️  DRY RUN: 실제 작업은 수행되지 않습니다.`);
  }
}

async function main() {
  console.log("🚀 아티스트 매핑 작업을 시작합니다...\n");

  if (isDryRun) {
    console.log("⚠️  DRY RUN 모드: 실제 변경은 수행되지 않습니다.\n");
  }

  // JSON 파일 읽기
  const jsonPath = path.join(__dirname, "artist-mapping-operations.json");
  const jsonContent = fs.readFileSync(jsonPath, "utf-8");
  const data: OperationsFile = JSON.parse(jsonContent);

  console.log(`📄 총 ${data.operations.length}개의 작업이 있습니다.\n`);

  for (const operation of data.operations) {
    if (operation.type === "copy_songs_and_delete") {
      await copySongsAndDelete(operation);
    } else if (operation.type === "merge_artists") {
      await mergeArtists(operation);
    }
  }

  console.log(`\n\n✅ 모든 작업이 완료되었습니다.`);
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
