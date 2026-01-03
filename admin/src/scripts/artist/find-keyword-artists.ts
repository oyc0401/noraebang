/**
 * 특정 키워드를 포함한 아티스트 이름을 찾는 스크립트
 *
 * pnpm ts-node src/scripts/artist/find-keyword-artists.ts
 * pnpm ts-node src/scripts/artist/find-keyword-artists.ts --keywords=feat,prod,&
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const argKeywords = process.argv
  .find((arg) => arg.startsWith("--keywords="))
  ?.replace("--keywords=", "")
  .split(",")
  .map((keyword) => keyword.trim())
  .filter(Boolean);

const DEFAULT_KEYWORDS = ["feat", "prod"];
const keywords = argKeywords?.length ? argKeywords : DEFAULT_KEYWORDS;

async function findKeywordArtists() {
  console.log("🔍 키워드가 포함된 아티스트 이름을 찾습니다...\n");
  console.log(`검색 키워드: ${keywords.join(", ")}\n`);

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

    let matchCount = 0;

    for (const artist of artists) {
      const haystack = [artist.name, artist.nameKo, artist.alias]
        .map((value) => value?.toLowerCase() ?? "")
        .join(" ");

      const matchedKeyword = keywords.find((keyword) =>
        haystack.includes(keyword.toLowerCase()),
      );
      if (!matchedKeyword) continue;

      matchCount += 1;
      console.log(
        `⚠️  [${matchedKeyword}] ${artist.name} (ID: ${artist.id}) - nameKo: ${
          artist.nameKo ?? "-"
        }, alias: ${artist.alias ?? "-"}`,
      );
    }

    if (matchCount === 0) {
      console.log("✅ 해당 키워드를 가진 아티스트가 없습니다.");
    } else {
      console.log(`\n총 ${matchCount}명의 아티스트가 키워드를 포함합니다.`);
    }
  } catch (error) {
    console.error("❌ 검사 중 오류가 발생했습니다.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

findKeywordArtists();
