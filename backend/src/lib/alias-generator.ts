import { convert as romanize } from 'hangul-romanization';
import hanja from 'hanja';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

// Kuroshiro 초기화 (일본어 처리용)
const kuroshiro = new Kuroshiro();
let kuroshiroInitialized = false;

/**
 * 아티스트 이름을 alias로 변환
 * 한자 → 한글 → 로마자
 * 일본어 → 로마자
 * 한글 → 로마자
 */
export async function generateAlias(artistName: string): Promise<string> {
  console.log(`🔤 Converting "${artistName}" to alias...`);

  // Kuroshiro 초기화 (최초 1회만)
  if (!kuroshiroInitialized) {
    await kuroshiro.init(new KuromojiAnalyzer());
    kuroshiroInitialized = true;
  }

  // 1. 한자가 있으면 한글로 변환 시도
  let processed = artistName;
  try {
    // @ts-expect-error - hanja 타입 정의 불완전
    processed = hanja.translate(artistName, 'substitution') || artistName;
    console.log(`   한자→한글: "${processed}"`);
  } catch (e) {
    console.log(`   한자→한글 변환 실패, 원본 사용: "${processed}"`);
  }

  // 2. 일본어(히라가나/가타카나) 체크
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(processed);
  if (hasJapanese) {
    // 일본어를 로마자로 변환
    const romanized = await kuroshiro.convert(processed, {
      to: 'romaji',
      mode: 'spaced',
    });
    processed = romanized;
    console.log(`   일본어→로마자: "${processed}"`);
  }

  // 3. 한글을 로마자로 변환
  const hasKorean = /[가-힣]/.test(processed);
  if (hasKorean) {
    processed = romanize(processed);
    console.log(`   한글→로마자: "${processed}"`);
  }

  // 4. 특수문자 처리 및 정리
  const alias = processed
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // 알파벳, 숫자 외 모두 -로
    .replace(/-+/g, '-') // 연속된 - 하나로
    .replace(/^-|-$/g, ''); // 시작/끝 - 제거

  console.log(`   최종 alias: "${alias}"\n`);

  return alias;
}
