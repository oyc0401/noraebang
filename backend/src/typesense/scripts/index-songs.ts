// pnpm ts-node src/typesense/scripts/index-songs.ts
//
// 이 스크립트는 DB의 곡 데이터를 Typesense에 인덱싱합니다.
// SongAlias, ArtistAlias 테이블을 활용하여 q_* 검색 필드를 생성합니다.
//
// 사용법:
// 1. Typesense 서버가 실행 중인지 확인 (docker compose up -d typesense)
// 2. 환경 변수 설정 (.env 파일)
// 3. cd backend && pnpm ts-node src/typesense/scripts/index-songs.ts
//
// 주의:
// - 기존 songs Collection을 삭제하고 새로 만듭니다
// - 현재는 artistId < 300인 아티스트의 곡만 인덱싱합니다
// - 인덱싱 시간은 데이터 양에 따라 다릅니다 (100개 = ~1초)

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { createTypesenseClient } from "../client";
import { indexDocuments, recreateCollection } from "../indexer";
import { songsCollectionSchema } from "../schema";
import {
  transformSongToDocument,
  type SongWithRelations,
} from "../transformer-song";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("======================================");
  console.log("Typesense Songs Indexer");
  console.log("======================================\n");

  // 1. Typesense 클라이언트 생성
  const client = createTypesenseClient();

  // 2. Collection 재생성
  console.log("Step 1: Recreating collection...");
  await recreateCollection(client, songsCollectionSchema);

  // 3. DB에서 데이터 가져오기 (artistId < 300만)
  console.log("\nStep 2: Fetching songs from database...");
  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: {
          artistId: {
            lt: 300,
          },
        },
      },
    },
    include: {
      artistSongs: {
        include: {
          artist: {
            include: {
              spotifyArtist: {
                select: {
                  popularity: true,
                },
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
      songSpotifyTracks: {
        include: {
          spotifyTrack: {
            select: {
              popularity: true,
            },
          },
        },
      },
    },
  });

  console.log(`✓ Found ${songs.length} songs`);

  // 4. 변환
  console.log("\nStep 3: Transforming to Typesense documents...");
  const documents = songs.map((song) =>
    transformSongToDocument(song as SongWithRelations),
  );
  console.log(`✓ Transformed ${documents.length} documents`);

  // 5. 인덱싱
  console.log("\nStep 4: Indexing documents...");
  await indexDocuments(client, songsCollectionSchema.name, documents);

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
