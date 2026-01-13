// pnpm ts-node src/typesense/scripts/export-song-document.ts 242
// pnpm ts-node src/typesense/scripts/export-song-document.ts 1
//
// 이 스크립트는 특정 songId의 Typesense 문서를 생성하여 JSON 파일로 저장합니다.
// 실제로 DB에서 데이터를 가져와 transformer를 거쳐 생성된 문서를
// backend/src/typesense/example/example_{songId}.json 형식으로 저장합니다.
//
// 사용법:
// 1. cd backend
// 2. pnpm ts-node src/typesense/scripts/export-song-document.ts <songId>
//
// 예시:
// pnpm ts-node src/typesense/scripts/export-song-document.ts 242
//
// 결과:
// backend/src/typesense/example/example_242.json 파일 생성

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import {
  transformSongToDocument,
  type SongWithRelations,
} from "../transformer";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. 커맨드라인 인자에서 songId 가져오기
  const songIdArg = process.argv[2];

  if (!songIdArg) {
    console.error("❌ Error: songId 인자가 필요합니다.");
    console.error(
      "사용법: pnpm ts-node src/typesense/scripts/export-song-document.ts <songId>",
    );
    process.exit(1);
  }

  const songId = Number.parseInt(songIdArg, 10);

  if (Number.isNaN(songId)) {
    console.error(`❌ Error: 유효하지 않은 songId입니다: ${songIdArg}`);
    process.exit(1);
  }

  console.log("======================================");
  console.log("Typesense Song Document Exporter");
  console.log("======================================\n");
  console.log(`🔍 Fetching song with ID: ${songId}\n`);

  // 2. DB에서 곡 데이터 가져오기
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      artistSongs: {
        include: {
          artist: {
            include: {
              spotifyArtist: {
                select: { popularity: true },
              },
              tjSongs: {
                select: { tjSongId: true },
              },
            },
          },
        },
      },
      tjSong: {
        select: { id: true },
      },
      spotifyTrackGroup: {
        include: {
          primaryTrack: {
            select: {
              popularity: true,
            },
          },
        },
      },
    },
  });

  if (!song) {
    console.error(`❌ Error: songId ${songId}를 찾을 수 없습니다.`);
    process.exit(1);
  }

  console.log(`✓ Found song: ${song.title}`);
  console.log(`  - titleKo: ${song.titleKo ?? "(없음)"}`);
  console.log(
    `  - artists: ${song.artistSongs.map((as) => as.artist.name).join(", ")}`,
  );

  // 3. Typesense 문서로 변환
  console.log("\n📝 Transforming to Typesense document...");
  const document = transformSongToDocument(song as SongWithRelations);
  console.log("✓ Transformation complete");

  // 4. JSON 파일로 저장
  const outputPath = join(__dirname, "..", "example", `example_${songId}.json`);
  const jsonContent = JSON.stringify(document, null, 2);

  writeFileSync(outputPath, jsonContent, "utf-8");

  console.log(`\n💾 Saved to: ${outputPath}`);
  console.log("\n======================================");
  console.log("✓ All done!");
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("\n✗ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
