/**
 * fetch-and-link-artists.json 파일을 읽어 각 항목에 spotifyName 필드를 추가하는 스크립트
 *
 * 기능:
 * - fetch-and-link-artists.json의 duplicates 배열을 읽음
 * - 각 항목의 spotifyArtistId로 DB에서 SpotifyArtist를 조회
 * - spotifyName 필드를 추가하여 fetch-and-link-artists2.json에 저장
 *
 * 사용법:
 * npx tsx src/scripts/spotify/fetch-and-link-artists2.ts
 */

import "dotenv/config";
import { readFile, writeFile } from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_PATH = path.resolve(__dirname, "fetch-and-link-artists.json");
const OUTPUT_PATH = path.resolve(__dirname, "fetch-and-link-artists2.json");

type DuplicateLogEntry = {
  id: number;
  name: string;
  spotifyArtistId: string;
  targetId: number;
  targetName: string | null;
};

type DuplicateLog = {
  duplicates: DuplicateLogEntry[];
};

type EnrichedDuplicateLogEntry = DuplicateLogEntry & {
  spotifyName?: string;
};

type EnrichedDuplicateLog = {
  duplicates: EnrichedDuplicateLogEntry[];
};

async function main() {
  console.log("\n=== Spotify Name 추가 스크립트 ===\n");

  // 1. JSON 파일 읽기
  console.log("Step 1: JSON 파일 읽는 중...");
  const rawJson = await readFile(INPUT_PATH, "utf8");
  const data: DuplicateLog = JSON.parse(rawJson);
  console.log(`✓ ${data.duplicates.length}개 항목 로드 완료\n`);

  // 2. 각 항목에 대해 SpotifyArtist 조회
  console.log("Step 2: Spotify 아티스트 정보 조회 중...");
  const enrichedDuplicates: EnrichedDuplicateLogEntry[] = [];

  for (let i = 0; i < data.duplicates.length; i++) {
    const entry = data.duplicates[i];

    try {
      const spotifyArtist = await prisma.spotifyArtist.findUnique({
        where: { spotifyId: entry.spotifyArtistId },
        select: { name: true },
      });

      enrichedDuplicates.push({
        ...entry,
        spotifyName: spotifyArtist?.name,
      });

      if (spotifyArtist) {
        console.log(
          `  [${i + 1}/${data.duplicates.length}] ✓ [${entry.id}] ${entry.name} → ${spotifyArtist.name}`,
        );
      } else {
        console.log(
          `  [${i + 1}/${data.duplicates.length}] ⚠️  [${entry.id}] ${entry.name} - Spotify 아티스트 없음`,
        );
      }
    } catch (error) {
      console.error(
        `  [${i + 1}/${data.duplicates.length}] ❌ [${entry.id}] ${entry.name} - 오류: ${error}`,
      );
      enrichedDuplicates.push(entry);
    }
  }

  // 3. 결과 저장
  console.log("\nStep 3: 결과 저장 중...");
  const enrichedLog: EnrichedDuplicateLog = {
    duplicates: enrichedDuplicates,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(enrichedLog, null, 2)}\n`, "utf8");
  console.log(`✓ ${OUTPUT_PATH}에 저장 완료\n`);

  // 4. 통계 출력
  const withSpotifyName = enrichedDuplicates.filter((e) => e.spotifyName);
  const withoutSpotifyName = enrichedDuplicates.filter((e) => !e.spotifyName);

  console.log("=== 결과 ===");
  console.log(`✅ Spotify 이름 추가: ${withSpotifyName.length}개`);
  console.log(`⚠️  Spotify 이름 없음: ${withoutSpotifyName.length}개`);

  if (withoutSpotifyName.length > 0) {
    console.log("\n📋 Spotify 이름이 없는 항목 (최대 10개):");
    withoutSpotifyName.slice(0, 10).forEach((entry) => {
      console.log(`  - [${entry.id}] ${entry.name} (${entry.spotifyArtistId})`);
    });
    if (withoutSpotifyName.length > 10) {
      console.log(`  ... 외 ${withoutSpotifyName.length - 10}개`);
    }
  }

  console.log("\n✅ 완료!");
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
