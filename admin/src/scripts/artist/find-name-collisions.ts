/**
 * 아티스트 이름으로 검색했을 때 다른 아티스트가 함께 나타나는지 검사하는 스크립트
 *
 * pnpm ts-node src/scripts/artist/find-name-collisions.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

async function findNameCollisions() {
  console.log("🔍 아티스트 이름 검색 시 동명이인 여부를 검사합니다...\n");

  try {
    const artists = await prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        nameKo: true,
        alias: true,
      },
      orderBy: { id: "asc" },
    });

    let collisionCount = 0;

    for (const artist of artists) {
      const keyword = artist.name?.trim();
      if (!keyword) continue;

      const matches = await prisma.artist.findMany({
        where: {
          OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { nameKo: { contains: keyword, mode: "insensitive" } },
            { alias: { contains: keyword, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          nameKo: true,
          alias: true,
        },
        orderBy: { id: "asc" },
      });

      const others = matches.filter((match) => match.id !== artist.id);
      if (others.length === 0) continue;

      collisionCount += 1;
      console.log(
        `⚠️  ${artist.name} (ID: ${artist.id}) 검색 시 다른 아티스트 ${
          others.length
        }명 발견`,
      );

      others.forEach((match) => {
        console.log(
          `    - ID: ${match.id}, name: ${match.name ?? "-"}, nameKo: ${
            match.nameKo ?? "-"
          }, alias: ${match.alias ?? "-"}`,
        );
      });
      console.log("");
    }

    if (collisionCount === 0) {
      console.log("✅ 모든 아티스트 이름에서 중복 검색 결과가 발견되지 않았습니다.");
    } else {
      console.log(
        `\n총 ${collisionCount}명의 아티스트에서 중복 검색 결과가 발견되었습니다.`,
      );
    }
  } catch (error) {
    console.error("❌ 검사 중 오류가 발생했습니다.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

findNameCollisions();
