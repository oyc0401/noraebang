import { Kanabarum } from "kanabarum";
/**
 * 문자열을 히라가나로 변환하는 스크립트
 *
 * 입력된 문자열(한자, 가타카나 등)을 히라가나로 변환하여 출력합니다.
 * kuroshiro 라이브러리를 사용합니다.
 *
 * 사용법:
 * pnpm ts-node src/scripts/name/convert-to-hiragana.ts
 */

// 변환할 대상 문자열들
const TARGET_STRINGS = [
  "中森明菜",
  "七ツ風",
  "YOASOBI",
  "米津玄師",
  "カタカナ",
  "東京",
];

async function main() {
  console.log("======================================");
  console.log("Hiragana Converter");
  console.log("======================================\n");

  // kuroshiro 초기화
  console.log("🔧 Initializing kuroshiro...");
  const kanabarum = new Kanabarum();
  await kanabarum.init();
  console.log("✓ Kuroshiro initialized\n");

  console.log("📝 Converting strings to hiragana:\n");

  for (const text of TARGET_STRINGS) {
    const hiragana = await kanabarum.kanaToHangul(text);
    console.log(`  ${text} → ${hiragana}`);
  }

  console.log("\n======================================");
  console.log("✓ Done!");
  console.log("======================================");
}

main().catch((error) => {
  console.error("❌ 오류 발생:", error);
  process.exit(1);
});
