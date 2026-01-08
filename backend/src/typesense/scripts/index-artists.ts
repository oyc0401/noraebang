// pnpm ts-node typesense/scripts/index-artists.ts
//
// 이 스크립트는 DB의 아티스트 데이터를 Typesense에 인덱싱합니다.
// ArtistAlias 테이블을 활용하여 q_name_* 검색 필드를 생성합니다.
//
// 사용법:
// 1. Typesense 서버가 실행 중인지 확인 (docker compose up -d typesense)
// 2. 환경 변수 설정 (.env 파일)
// 3. cd backend && pnpm ts-node typesense/scripts/index-artists.ts
//
// 주의:
// - 기존 artists Collection을 삭제하고 새로 만듭니다
// - 현재는 artistId < 272인 아티스트만 인덱싱합니다
// - 인덱싱 시간은 데이터 양에 따라 다릅니다 (100개 = ~1초)

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { createTypesenseClient } from "../client";
import { indexDocuments, recreateCollection } from "../indexer";
import { artistsCollectionSchema } from "../schema";
import { transformArtistToDocument } from "../transformer";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("======================================");
  console.log("Typesense Artists Indexer");
  console.log("======================================\n");

  // 1. Typesense 클라이언트 생성
  const client = createTypesenseClient();

  // 2. Collection 재생성
  console.log("Step 1: Recreating collection...");
  await recreateCollection(client, artistsCollectionSchema);

  // 3. DB에서 데이터 가져오기 (artistId < 272만)
  console.log("\nStep 2: Fetching artists from database...");
  const artists = await prisma.artist.findMany({
    where: {
      id: {
        lt: 272,
      },
    },
    include: {
      aliases: true,
      spotifyArtist: {
        select: {
          popularity: true,
        },
      },
    },
  });

  console.log(`✓ Found ${artists.length} artists`);

  // 4. 변환
  console.log("\nStep 3: Transforming to Typesense documents...");
  const documents = artists.map(transformArtistToDocument);
  console.log(`✓ Transformed ${documents.length} documents`);

  // 5. 인덱싱
  console.log("\nStep 4: Indexing documents...");
  await indexDocuments(client, artistsCollectionSchema.name, documents);

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
