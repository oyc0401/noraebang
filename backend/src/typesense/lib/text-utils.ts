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
 * 구두점 제거 (일본어/한국어/영어 구두점 모두 제거)
 */
export function removePunctuation(text: string): string {
  return text
    .replace(/[。、！？!?.,;:~・]/g, "")
    .trim();
}

/**
 * 괄호와 구두점을 모두 제거
 */
export function cleanText(text: string): string {
  return removePunctuation(removeBrackets(text));
}

/**
 * 공백을 완전히 제거
 */
export function removeSpaces(text: string): string {
  return text.replace(/\s+/g, "");
}

/**
 * 특수문자를 공백으로 바꾸고 연속 공백을 1칸으로 줄인 뒤 trim
 */
export function normalizeSpacing(text: string): string {
  const replaced = text.replace(/[^\p{L}\p{N}]+/gu, " ");
  return replaced.replace(/\s+/g, " ").trim();
}

