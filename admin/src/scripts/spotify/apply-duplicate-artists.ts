/**
 * fetch-and-link-artists.json에 있는 중복 아티스트들의 spotifyId를 등록하는 스크립트
 *
 * 기능:
 * - fetch-and-link-artists.json의 duplicates 배열을 읽음
 * - 각 항목의 Artist에 spotifyArtistId를 등록
 * - 유니크 제약이 제거되었으므로 여러 Artist가 같은 spotifyId를 가질 수 있음
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/apply-duplicate-artists.ts --dry-run
 * pnpm ts-node src/scripts/spotify/apply-duplicate-artists.ts
 */

import "dotenv/config";
import { readFile } from "fs/promises";
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
const DUPLICATE_LOG_PATH = path.resolve(__dirname, "fetch-and-link-artists.json");

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

async function loadDuplicateLog(): Promise<DuplicateLog> {
  try {
    const raw = await readFile(DUPLICATE_LOG_PATH, "utf8");
    return JSON.parse(raw) as DuplicateLog;
  } catch (error) {
    throw new Error(`JSON 파일을 읽을 수 없습니다: ${error}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log(
    `\n=== Spotify 중복 아티스트 등록 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1. JSON 파일 로드
  console.log("Step 1: JSON 파일 로드 중...");
  const log = await loadDuplicateLog();
  console.log(`✓ ${log.duplicates.length}개의 중복 항목 발견\n`);

  if (log.duplicates.length === 0) {
    console.log("등록할 항목이 없습니다.");
    return;
  }

  // 2. 각 항목 처리
  console.log("Step 2: spotifyId 등록 중...");

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < log.duplicates.length; i++) {
    const entry = log.duplicates[i];

    try {
      // Artist 존재 확인
      const artist = await prisma.artist.findUnique({
        where: { id: entry.id },
        select: { id: true, name: true, spotifyId: true },
      });

      if (!artist) {
        console.log(
          `  [${i + 1}/${log.duplicates.length}] ⚠️  [${entry.id}] ${entry.name} - Artist가 존재하지 않음`,
        );
        skipCount++;
        continue;
      }

      // 이미 등록되어 있는지 확인
      if (artist.spotifyId === entry.spotifyArtistId) {
        console.log(
          `  [${i + 1}/${log.duplicates.length}] ℹ️  [${entry.id}] ${entry.name} - 이미 등록됨`,
        );
        skipCount++;
        continue;
      }

      if (!isDryRun) {
        // spotifyId 업데이트
        await prisma.artist.update({
          where: { id: entry.id },
          data: { spotifyId: entry.spotifyArtistId },
        });
      }

      console.log(
        `  [${i + 1}/${log.duplicates.length}] ✓ [${entry.id}] ${entry.name} → ${entry.spotifyArtistId}${
          artist.spotifyId ? ` (기존: ${artist.spotifyId})` : ""
        }`,
      );
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(
        `  [${i + 1}/${log.duplicates.length}] ❌ [${entry.id}] ${entry.name} - 오류: ${error}`,
      );
    }
  }

  // 결과 출력
  console.log(`\n=== 결과 ===`);
  console.log(`✅ 등록 완료: ${successCount}개`);
  console.log(`ℹ️  건너뜀: ${skipCount}개`);
  console.log(`❌ 오류 발생: ${errorCount}개`);

  if (isDryRun) {
    console.log(
      `\n💡 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`,
    );
  } else {
    console.log(`\n✅ 등록 완료!`);
  }
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
