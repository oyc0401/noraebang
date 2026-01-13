/**
 * 아티스트 이름 자동 채우기 스크립트
 *
 * artistId 300 이하 아티스트의 name, spotifyArtistName, 유튜브 토픽채널명을 기반으로
 * nameLatin, nameJaKanji, nameJaKana를 자동으로 채웁니다.
 * (nameKo는 필수 컬럼이므로 이미 값이 있음)
 *
 * ⚠️ 중요: 기존 값 보존 정책
 * - 기존에 값이 있는 필드는 절대 변경/삭제하지 않음
 * - null인 필드만 새로 채움 (삽입만 가능)
 *
 * 처리 순서:
 * 1. spotifyArtistName 언어 감지하여 해당 필드가 null일 때만 저장
 * 2. artist.name 언어 감지하여 해당 필드가 null일 때만 저장
 * 3. 토픽 채널 이름 언어 감지하여 해당 필드가 null일 때만 저장
 * 4. nameJaKanji가 있고 nameJaKana가 없으면 kuroshiro로 히라가나 변환 후 저장
 *
 * 예시:
 * - spotifyArtistName="Nanatsukaze" → nameLatin에 저장
 * - artist.name="ナナツカゼ" → nameJaKana에 저장
 * - artist.name="中森明菜" → nameJaKanji에 저장, nameJaKana에 "なかもりあきな" 저장
 *
 * 언어 감지 규칙:
 * - 특수문자 제거 후 판단
 * - 전부 영어(라틴 문자)면 → nameLatin
 * - 일본어가 1개라도 있으면:
 *   - 한자가 하나라도 있으면 → nameJaKanji (+ kuroshiro로 히라가나 변환해서 nameJaKana에도 저장)
 *   - 한자가 없으면 → nameJaKana
 * - 둘 다 아니면 → nameKo
 *
 * 사용법:
 * pnpm ts-node src/scripts/name/auto-fill-artist-names.ts
 * pnpm ts-node src/scripts/name/auto-fill-artist-names.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { isKanji, isKana } from "wanakana";
// @ts-ignore
import Kuroshiro from "kuroshiro";
// @ts-ignore
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 특수문자 제거
function removeSpecialChars(text: string): string {
  return text.replace(
    /[『』「」【】［］()（）[\]<>《》{}\s!@#$%^&*_+=|\\:;"',.<>?/~`-]/g,
    "",
  );
}

// 영어(라틴 문자)만 포함되어 있는지 확인
function isOnlyLatin(text: string): boolean {
  // 특수문자 제거 후 판단
  const cleaned = removeSpecialChars(text);
  // 라틴 문자(a-zA-Z), 숫자만 있는지 확인
  return /^[a-zA-Z0-9]+$/.test(cleaned);
}

// 한자가 포함되어 있는지 확인
function hasKanji(text: string): boolean {
  return /[\u4e00-\u9faf]/.test(text);
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

  // 한자가 하나라도 포함되어 있으면 nameJaKanji
  if (hasKanji(cleaned)) {
    return "nameJaKanji";
  }

  // 전부 가나(히라가나/가타카나)면 nameJaKana
  if (isKana(cleaned)) {
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

  // kuroshiro 초기화
  console.log("🔧 Initializing kuroshiro...");
  console.log(KuromojiAnalyzer);
  const kuroshiro = new Kuroshiro.default();
  await kuroshiro.init(new KuromojiAnalyzer());
  console.log("✓ Kuroshiro initialized\n");

  // artistId가 300 이하인 아티스트만 가져오기 (SpotifyArtist, YoutubeChannel 정보 포함)
  console.log("📦 Fetching artists (id <= 300)...");
  const artists = await prisma.artist.findMany({
    where: {
      id: {
        lte: 300,
      },
    },
    orderBy: {
      id: "asc",
    },
    include: {
      spotifyArtist: {
        select: {
          name: true,
        },
      },
      youtubeChannels: {
        where: {
          type: "TOPIC",
        },
        select: {
          title: true,
        },
      },
    },
  });

  console.log(`✓ Found ${artists.length} artists\n`);

  let updatedCount = 0;

  for (const artist of artists) {
    const updateData: any = {};
    const logs: string[] = [];

    // 이름을 언어 감지해서 해당 필드에 저장하는 함수
    function saveName(name: string, source: string) {
      const field = detectLanguageField(name);

      if (
        field === "nameLatin" &&
        artist.nameLatin === null &&
        !updateData.nameLatin
      ) {
        updateData.nameLatin = name;
        logs.push(`nameLatin=${name} (${source})`);
      }
      if (
        field === "nameJaKanji" &&
        artist.nameJaKanji === null &&
        !updateData.nameJaKanji
      ) {
        updateData.nameJaKanji = name;
        logs.push(`nameJaKanji=${name} (${source})`);
      }
      if (
        field === "nameJaKana" &&
        artist.nameJaKana === null &&
        !updateData.nameJaKana
      ) {
        updateData.nameJaKana = name;
        logs.push(`nameJaKana=${name} (${source})`);
      }
      if (field === "nameKo" && artist.nameKo === null && !updateData.nameKo) {
        updateData.nameKo = name;
        logs.push(`nameKo=${name} (${source})`);
      }
    }

    // 1. spotifyArtistName 처리
    if (artist.spotifyArtist?.name) {
      saveName(artist.spotifyArtist.name, "spotify");
    }

    // 2. artist.name 처리
    if (artist.name) {
      saveName(artist.name, "name");
    }

    // 3. 토픽 채널 이름 처리
    const topicChannel = artist.youtubeChannels.find((ch) =>
      ch.title?.endsWith(" - Topic"),
    );
    const topicChannelName = topicChannel?.title?.replace(" - Topic", "");
    if (topicChannelName) {
      saveName(topicChannelName, "topic");
    }

    // // 4. nameJaKanji가 있고 nameJaKana가 없으면 히라가나로 변환 (정확도 때문에 비활성화.)
    // const kanjiName = updateData.nameJaKanji || artist.nameJaKanji;
    // if (kanjiName && artist.nameJaKana === null && !updateData.nameJaKana) {
    //   const hiragana = await kuroshiro.convert(kanjiName, { to: "hiragana" });
    //   updateData.nameJaKana = hiragana;
    //   logs.push(`nameJaKana=${hiragana} (converted from kanji)`);
    // }

    // 업데이트할 필드가 있을 때만 실행
    if (Object.keys(updateData).length > 0) {
      console.log(`[${artist.id}] ${logs.join(", ")}`);

      if (!isDryRun) {
        await prisma.artist.update({
          where: { id: artist.id },
          data: updateData,
        });
      }
      updatedCount++;
    } else {
      console.log(`[${artist.id}] (no changes - all fields already filled)`);
    }
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
