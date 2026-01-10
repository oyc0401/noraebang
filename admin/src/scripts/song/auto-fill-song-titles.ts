/**
 * 곡 제목 자동 채우기 스크립트
 *
 * 모든 곡의 title, spotifyTrackName, spotifyMusicBrainzTitle을 기반으로
 * titleLatin, titleJaKanji, titleJaKana, titleKo를 자동으로 채웁니다.
 *
 * 우선순위:
 * 1. spotifyTrackName (SpotifyTrack.name)
 * 2. spotifyMusicBrainzTitle (SpotifyTrack.musicBrainzTitle)
 * 3. song.title
 *
 * 언어 감지 규칙:
 * - 특수문자 제거 후 판단
 * - 전부 영어(라틴 문자)면 → titleLatin
 * - 일본어가 1개라도 있으면:
 *   - 한자가 하나라도 있으면 → titleJaKanji
 *   - 한자가 없으면 → titleJaKana
 * - 둘 다 아니면 → titleKo
 *
 * 사용법:
 * pnpm ts-node src/scripts/song/auto-fill-song-titles.ts
 * pnpm ts-node src/scripts/song/auto-fill-song-titles.ts --dry-run
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
  title: string,
): "titleLatin" | "titleJaKanji" | "titleJaKana" | "titleKo" {
  const cleaned = removeSpecialChars(title);

  // 전부 영어면 titleLatin
  if (isOnlyLatin(cleaned)) {
    return "titleLatin";
  }

  // 일본어가 1개라도 있으면
  if (hasJapanese(cleaned)) {
    // 한자가 하나라도 있으면 titleJaKanji
    if (hasKanji(cleaned)) {
      return "titleJaKanji";
    }
    // 한자가 없으면 titleJaKana
    return "titleJaKana";
  }

  // 둘 다 아니면 titleKo
  return "titleKo";
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("======================================");
  console.log("Song Titles Auto-Fill Script");
  console.log("======================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "PRODUCTION"}\n`);

  // 모든 곡 가져오기 (SpotifyTrack 정보 포함)
  console.log("📦 Fetching all songs...");
  const songs = await prisma.song.findMany({
    include: {
      spotifyTrack: {
        include: {
          spotifyTrack: {
            select: {
              name: true,
              musicBrainzTitle: true,
            },
          },
        },
      },
    },
  });

  console.log(`✓ Found ${songs.length} songs\n`);

  let updatedCount = 0;

  for (const song of songs) {
    // 우선순위에 따라 제목 선택
    let selectedTitle: string | null = null;
    let source = "";

    if (song.spotifyTrack?.spotifyTrack?.name) {
      selectedTitle = song.spotifyTrack.spotifyTrack.name;
      source = "spotifyTrackName";
    } else if (song.spotifyTrack?.spotifyTrack?.musicBrainzTitle) {
      selectedTitle = song.spotifyTrack.spotifyTrack.musicBrainzTitle;
      source = "spotifyMusicBrainzTitle";
    } else {
      selectedTitle = song.title;
      source = "song.title";
    }

    if (selectedTitle) {
      // 선택된 제목이 있으면 언어 감지 후 해당 필드에 저장
      const field = detectLanguageField(selectedTitle);

      console.log(
        `[${song.id}] ${selectedTitle} → ${field} (source: ${source})`,
      );

      if (!isDryRun) {
        const updateData: any = {
          titleLatin: field === "titleLatin" ? selectedTitle : null,
          titleJaKanji: field === "titleJaKanji" ? selectedTitle : null,
          titleJaKana: field === "titleJaKana" ? selectedTitle : null,
        };

        // titleKo는 값이 있을 때만 업데이트 (null로 덮어쓰지 않음)
        if (field === "titleKo") {
          updateData.titleKo = selectedTitle;
        }

        await prisma.song.update({
          where: { id: song.id },
          data: updateData,
        });
      }
    } else {
      // 선택된 제목이 null이면 일본어/라틴 필드만 null로 초기화 (titleKo는 보존)
      console.log(`[${song.id}] (no title) → clearing JA/Latin fields only`);

      if (!isDryRun) {
        await prisma.song.update({
          where: { id: song.id },
          data: {
            titleLatin: null,
            titleJaKanji: null,
            titleJaKana: null,
          },
        });
      }
    }

    updatedCount++;
  }

  console.log("\n======================================");
  console.log("Summary");
  console.log("======================================");
  console.log(`Total songs: ${songs.length}`);
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
