/**
 * J-pop 아티스트 목록 조회 및 JSON 내보내기 스크립트
 * homeCatalog가 'JPOP'인 아티스트 목록을 조회하고 JSON 파일로 저장합니다.
 *
 * pnpm ts-node src/scripts/artist/count-jpop-artists.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

async function main() {
  const artists = await prisma.artist.findMany({
    where: {
      homeCatalog: "JPOP",
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log(`🎵 J-pop 아티스트 수: ${artists.length}명`);

  const outputPath = path.join(__dirname, "jpop-artists.json");
  fs.writeFileSync(outputPath, JSON.stringify(artists, null, 2), "utf-8");
  console.log(`📁 저장 완료: ${outputPath}`);
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
