/**
 * 아티스트 이름으로 검색했을 때 다른 아티스트가 함께 나타나는지 검사하는 스크립트
 * JSON 형식으로 출력 (name만 포함, nameKo/slug 제외)
 *
 * pnpm ts-node src/scripts/artist/find-name-collisions.ts
 * pnpm ts-node src/scripts/artist/find-name-collisions.ts --output=admin/data/name-collisions.json
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg
  ? outputArg.split("=")[1]
  : "admin/data/name-collisions.json";

async function findNameCollisions() {
  const results: Array<{
    id: number;
    name: string;
    conflictsWith: Array<{ id: number; name: string }>;
  }> = [];

  try {
    const artists = await prisma.artist.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { id: "asc" },
    });

    for (const artist of artists) {
      const keyword = artist.name?.trim();
      if (!keyword || keyword.length <= 1) continue;

      const matches = await prisma.artist.findMany({
        where: {
          name: { contains: keyword, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { id: "asc" },
      });

      const others = matches.filter((match) => match.id !== artist.id);
      if (others.length === 0) continue;

      results.push({
        id: artist.id,
        name: artist.name,
        conflictsWith: others.map((match) => ({
          id: match.id,
          name: match.name,
        })),
      });
    }

    // JSON 파일로 저장
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`💾 ${results.length}건 저장: ${outputPath}`);
  } catch (error) {
    console.error("❌ 검사 중 오류가 발생했습니다.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

findNameCollisions();
