/**
 * 문자열에 완성되지 않은 한글(자음/모음만 있는 경우)이 포함되어 있는지 확인
 * @param text - 검사할 문자열
 * @returns 완성되지 않은 한글이 있으면 true
 * @example
 * hasIncompleteKorean("ㄱ") // true
 * hasIncompleteKorean("가") // false
 * hasIncompleteKorean("강ㄴ") // true
 * hasIncompleteKorean("hello") // false
 */
export function hasIncompleteKorean(text: string): boolean {
  // 한글 자음: ㄱ-ㅎ (0x3131-0x314E)
  // 한글 모음: ㅏ-ㅣ (0x314F-0x3163)
  const incompleteKoreanRegex = /[ㄱ-ㅎㅏ-ㅣ]/;
  return incompleteKoreanRegex.test(text);
}
