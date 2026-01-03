/**
 * 특정 협업 아티스트에 대응하는 실제 아티스트를 찾는 스크립트
 *
 * pnpm ts-node src/scripts/artist/find-real-artist.ts "간미연"
 * pnpm ts-node src/scripts/artist/find-real-artist.ts "간미연" "김경호" "김태우"
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const searchNames = process.argv.slice(2);

async function main() {
  if (searchNames.length === 0) {
    console.error("사용법: pnpm ts-node src/scripts/artist/find-real-artist.ts <검색이름1> [검색이름2] [검색이름3] ...");
    process.exit(1);
  }

  for (const searchName of searchNames) {
    console.log(`${"=".repeat(80)}`);
    console.log(`🔍 "${searchName}"를 포함하는 아티스트를 찾습니다...`);
    console.log(`${"=".repeat(80)}\n`);

    const artists = await prisma.artist.findMany({
      where: {
        OR: [
          { name: { contains: searchName, mode: "insensitive" } },
          { nameKo: { contains: searchName, mode: "insensitive" } },
        ],
      },
      include: {
        _count: {
          select: { artistSongs: true },
        },
      },
      orderBy: [{ id: "asc" }],
    });

    // 곡 수로 정렬
    artists.sort((a, b) => b._count.artistSongs - a._count.artistSongs);

    console.log(`총 ${artists.length}명의 아티스트 발견\n`);

    for (const artist of artists) {
      console.log(
        `ID: ${artist.id.toString().padStart(5)} | 곡: ${artist._count.artistSongs.toString().padStart(3)} | name: "${artist.name}" | nameKo: "${artist.nameKo || "-"}"`
      );
    }

    console.log("\n");
  }
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
