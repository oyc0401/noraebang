/**
 * Prisma DB에서 Song 테이블의 title, titleLatin을 순회하면서
 * 영어 단어들을 추출하여 word.json에 저장하는 스크립트
 *
 * - 특수문자는 공백으로 변환
 * - 영어 단어만 저장 (a-z, A-Z로만 구성된 단어)
 * - 소문자로 정규화
 * - 알파벳순 정렬
 */

// pnpm ts-node src/scripts/pron/extractWords.ts
// pnpm ts-node src/scripts/pron/extractWords.ts --dry-run

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes("--dry-run");

/**
 * 비라틴 문자가 포함되어 있는지 확인
 * (키릴, 한글, 일본어, 중국어 등)
 */
function hasNonLatinChars(text: string): boolean {
  // 키릴 문자 (러시아어 등)
  if (/[\u0400-\u04FF]/.test(text)) return true;
  // 한글
  if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) return true;
  // 일본어 히라가나/카타카나
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return true;
  // 한자 (CJK)
  if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(text)) return true;
  // 태국어
  if (/[\u0E00-\u0E7F]/.test(text)) return true;
  // 아랍어
  if (/[\u0600-\u06FF]/.test(text)) return true;
  // 히브리어
  if (/[\u0590-\u05FF]/.test(text)) return true;
  // 그리스어
  if (/[\u0370-\u03FF]/.test(text)) return true;

  return false;
}

/**
 * 특수문자를 공백으로 변환하고 영어 단어만 추출
 */
function extractEnglishWords(text: string): string[] {
  // 특수문자를 공백으로 변환 (영문자와 공백만 남김)
  const cleaned = text.replace(/[^a-zA-Z\s]/g, " ");

  // 공백으로 분리하고 빈 문자열 제거
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);

  // 소문자로 정규화
  return words.map((w) => w.toLowerCase());
}

async function main() {
  console.log("📚 DB에서 영어 단어 추출 시작...\n");

  // 모든 Song의 title, titleLatin 가져오기
  const songs = await prisma.song.findMany({
    select: {
      id: true,
      title: true,
      titleLatin: true,
    },
  });

  console.log(`📖 총 ${songs.length}개의 노래 조회됨\n`);

  const wordSet = new Set<string>();
  let skippedCount = 0;

  for (const song of songs) {
    // title 또는 titleLatin에 비라틴 문자가 포함되면 스킵
    const titleHasNonLatin = song.title && hasNonLatinChars(song.title);
    const titleLatinHasNonLatin =
      song.titleLatin && hasNonLatinChars(song.titleLatin);

    if (titleHasNonLatin || titleLatinHasNonLatin) {
      skippedCount++;
      continue;
    }

    // title에서 단어 추출
    if (song.title) {
      const words = extractEnglishWords(song.title);
      for (const w of words) {
        wordSet.add(w);
      }
    }

    // titleLatin에서 단어 추출
    if (song.titleLatin) {
      const words = extractEnglishWords(song.titleLatin);
      for (const w of words) {
        wordSet.add(w);
      }
    }
  }

  console.log(`📖 비라틴 문자 포함으로 스킵된 노래: ${skippedCount}개`);

  // 정렬
  const sortedWords = Array.from(wordSet).sort((a, b) => a.localeCompare(b));

  console.log(`📖 추출된 고유 단어 수: ${sortedWords.length}개\n`);

  // { word: true } 형식으로 변환
  const wordJson: Record<string, boolean> = {};
  for (const word of sortedWords) {
    wordJson[word] = true;
  }

  const outputPath = path.join(__dirname, "word.json");

  if (isDryRun) {
    console.log("🔍 [DRY-RUN] 처음 50개 단어 미리보기:\n");
    console.log(sortedWords.slice(0, 50).join(", "));
    console.log("\n...\n");
    console.log(`🔍 [DRY-RUN] 파일이 생성되지 않았습니다: ${outputPath}`);
  } else {
    fs.writeFileSync(outputPath, JSON.stringify(wordJson, null, 2), "utf-8");
    console.log(`✅ 파일 생성 완료: ${outputPath}`);
  }
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
