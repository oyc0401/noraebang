/**
 * 텍스트 처리 유틸리티 함수
 */

/**
 * 공백을 완전히 제거
 */
export function removeSpaces(text: string): string {
  return text.replace(/\s+/g, "");
}

/**
 * 특수문자를 공백으로 바꾸고 연속 공백을 1칸으로 줄인 뒤 trim
 */
export function removePunctuation(text: string): string {
  const replaced = text.replace(/[^\p{L}\p{N}]+/gu, " ");
  return replaced.replace(/\s+/g, " ").trim();
}

/**
 * 특수문자, 공백 제거
 */
export function normalizeBasic(text: string) {
  return removeSpaces(removePunctuation(text));
}
