/**
 * 아티스트 이름 자동 채우기 스크립트
 *
 * 모든 아티스트의 name, spotifyArtistName을 기반으로
 * nameLatin, nameJaKanji, nameJaKana를 자동으로 채웁니다.
 * (nameKo는 필수 컬럼이므로 이미 값이 있음)
 *
 * 우선순위:
 * 1. spotifyArtistName (SpotifyArtist.name)
 * 2. artist.name
 *
 * 언어 감지 규칙:
 * - 특수문자 제거 후 판단
 * - 전부 영어(라틴 문자)면 → nameLatin
 * - 일본어가 1개라도 있으면:
 *   - 한자가 하나라도 있으면 → nameJaKanji
 *   - 한자가 없으면 → nameJaKana
 * - 둘 다 아니면 → nameKo (이미 있으므로 스킵)
 *
 * 사용법:
 * pnpm ts-node src/scripts/song/auto-fill-artist-names.ts
 * pnpm ts-node src/scripts/song/auto-fill-artist-names.ts --dry-run
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

// 특수문자 제거
function removeSpecialChars(text: string): string {
  return text.replace(/[『』「」【】［］()（）\[\]<>《》{}\s!@#$%^&*_+=|\\:;"',.<>?/~`-]/g, "");
}

// 한자 포함 여부 확인
function hasKanji(text: string): boolean {
  return /[\u4e00-\u9faf]/.test(text);
}

// 일본어(히라가나/가타카나) 포함 여부 확인
function hasJapanese(text: string): boolean {
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
}

// 영어(라틴 문자)만 포함되어 있는지 확인
function isOnlyLatin(text: string): boolean {
  // 특수문자 제거 후 판단
  const cleaned = removeSpecialChars(text);
  // 라틴 문자(a-zA-Z), 숫자만 있는지 확인
  return /^[a-zA-Z0-9]+$/.test(cleaned);
}

// 언어 감지 및 필드 결정
function detectLanguageField(
  name: string,
): "nameLatin" | "nameJaKanji" | "nameJaKana" | "nameKo" {
  const cleaned = removeSpecialChars(name);

  // 전부 영어면 nameLatin
  if (isOnlyLatin(cleaned)) {
    return "nameLatin";
  }

  // 일본어가 1개라도 있으면
  if (hasJapanese(cleaned)) {
    // 한자가 하나라도 있으면 nameJaKanji
    if (hasKanji(cleaned)) {
      return "nameJaKanji";
    }
    // 한자가 없으면 nameJaKana
    return "nameJaKana";
  }

  // 둘 다 아니면 nameKo
  return "nameKo";
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("======================================");
  console.log("Artist Names Auto-Fill Script");
  console.log("======================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "PRODUCTION"}\n`);

  // 모든 아티스트 가져오기 (SpotifyArtist 정보 포함)
  console.log("📦 Fetching all artists...");
  const artists = await prisma.artist.findMany({
    include: {
      spotifyArtist: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`✓ Found ${artists.length} artists\n`);

  let updatedCount = 0;

  for (const artist of artists) {
    // 우선순위에 따라 이름 선택
    let selectedName: string | null = null;
    let source = "";

    if (artist.spotifyArtist?.name) {
      selectedName = artist.spotifyArtist.name;
      source = "spotifyArtistName";
    } else {
      selectedName = artist.name;
      source = "artist.name";
    }

    if (selectedName) {
      // 선택된 이름이 있으면 언어 감지 후 해당 필드에 저장
      const field = detectLanguageField(selectedName);

      console.log(
        `[${artist.id}] ${selectedName} → ${field} (source: ${source})`,
      );

      if (!isDryRun) {
        const updateData: any = {
          nameLatin: field === "nameLatin" ? selectedName : null,
          nameJaKanji: field === "nameJaKanji" ? selectedName : null,
          nameJaKana: field === "nameJaKana" ? selectedName : null,
        };

        // nameKo는 값이 있을 때만 업데이트 (null로 덮어쓰지 않음)
        if (field === "nameKo") {
          updateData.nameKo = selectedName;
        }

        await prisma.artist.update({
          where: { id: artist.id },
          data: updateData,
        });
      }
    } else {
      // 선택된 이름이 null이면 일본어/라틴 필드만 null로 초기화 (nameKo는 보존)
      console.log(`[${artist.id}] (no name) → clearing JA/Latin fields only`);

      if (!isDryRun) {
        await prisma.artist.update({
          where: { id: artist.id },
          data: {
            nameLatin: null,
            nameJaKanji: null,
            nameJaKana: null,
          },
        });
      }
    }

    updatedCount++;
  }

  console.log("\n======================================");
  console.log("Summary");
  console.log("======================================");
  console.log(`Total artists: ${artists.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log("======================================");

  if (isDryRun) {
    console.log("\n⚠️  DRY RUN - No changes were made to the database");
  } else {
    console.log("\n✓ All done!");
  }
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
