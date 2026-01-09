/**
 * ID가 300 미만인 아티스트 정보를 JSON으로 출력하는 스크립트
 *
 * 기능:
 * - artistId < 300인 아티스트 조회
 * - id, name, nameKo, spotifyName, spotifyId를 JSON 형식으로 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/artist/export-artists-json.ts
 * pnpm ts-node src/scripts/artist/export-artists-json.ts > artists.json
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
  // 아티스트 조회
  const artists = await prisma.artist.findMany({
    where: {
      id: { lt: 300 },
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
      spotifyArtist: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  // JSON 형식으로 변환
  const result = artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    spotifyName: artist.spotifyArtist?.name ?? null,
    spotifyId: artist.spotifyId ?? null,
  }));

  // JSON 출력 (pretty print)
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
