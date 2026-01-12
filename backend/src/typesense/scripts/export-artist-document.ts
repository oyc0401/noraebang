// pnpm ts-node src/typesense/scripts/export-artist-document.ts 15509
//
// 특정 artistId의 Typesense Artist 문서를 생성해 JSON 파일로 저장합니다.
// DB에서 아티스트를 조회한 뒤 transformer를 거쳐
// backend/src/typesense/example/example_artist_{artistId}.json 파일로 저장합니다.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { transformArtistToDocument } from "../transformer";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const artistIdArg = process.argv[2];

  if (!artistIdArg) {
    console.error("❌ Error: artistId 인자가 필요합니다.");
    console.error(
      "사용법: pnpm ts-node src/typesense/scripts/export-artist-document.ts <artistId>",
    );
    process.exit(1);
  }

  const artistId = Number.parseInt(artistIdArg, 10);
  if (Number.isNaN(artistId)) {
    console.error(`❌ Error: 유효하지 않은 artistId입니다: ${artistIdArg}`);
    process.exit(1);
  }

  console.log("======================================");
  console.log("Typesense Artist Document Exporter");
  console.log("======================================\n");
  console.log(`🔍 Fetching artist with ID: ${artistId}\n`);

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      aliases: true,
      artistSongs: {
        include: {
          song: {
            select: {
              tjSong: {
                select: { id: true },
              },
            },
          },
        },
      },
      spotifyArtist: {
        select: {
          popularity: true,
        },
      },
    },
  });

  if (!artist) {
    console.error(`❌ Error: artistId ${artistId}를 찾을 수 없습니다.`);
    process.exit(1);
  }

  console.log(`✓ Found artist: ${artist.name}`);
  console.log(`  - nameKo: ${artist.nameKo ?? "(없음)"}`);
  console.log(`  - aliases: ${artist.aliases.length}`);

  console.log("\n📝 Transforming to Typesense document...");
  const document = transformArtistToDocument(artist as any);
  console.log("✓ Transformation complete");

  const outputPath = join(
    __dirname,
    "..",
    "example",
    `example_artist_${artistId}.json`,
  );
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
