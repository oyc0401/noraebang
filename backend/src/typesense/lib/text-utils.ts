/**
 * 텍스트 처리 유틸리티 함수
 */

/**
 * 다양한 종류의 괄호를 제거
 */
export function removeBrackets(text: string): string {
  return text.replace(/[『』「」【】［］()（）[\]<>《》{}]/g, "").trim();
}

/**
 * 카타카나를 히라가나로 변환
 */
export function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * 히라가나를 카타카나로 변환
 */
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * 문자열에 히라가나와 카타카나가 섞여있는지 확인
 */
export function hasMixedKana(text: string): boolean {
  const hasHiragana = /[\u3040-\u309f]/.test(text);
  const hasKatakana = /[\u30a0-\u30ff]/.test(text);
  return hasHiragana && hasKatakana;
}

/**
 * 모든 카타카나를 히라가나로 변환 (전부 히라가나 버전)
 */
export function toAllHiragana(text: string): string {
  return katakanaToHiragana(text);
}

/**
 * 모든 히라가나를 카타카나로 변환 (전부 카타카나 버전)
 */
export function toAllKatakana(text: string): string {
  return hiraganaToKatakana(text);
}

/**
 * 일본어 문자 타입 감지
 * @returns "kanji" | "kana" | "mixed"
 */
export function detectJapaneseType(text: string): "kanji" | "kana" | "mixed" {
  const hasKanji = /[\u4e00-\u9faf]/.test(text);
  const hasKana = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);

  if (hasKanji) return "kanji";
  if (hasKana) return "kana";
  return "mixed";
}
