/**
 * Typesense 검색 쿼리 전처리 유틸리티
 */

/**
 * 검색 쿼리를 전처리합니다.
 *
 * 처리 규칙:
 * 1. 구두점 제거 (。、！？!?.,;:~・)
 * 2. 연속 공백을 단일 공백으로 변환
 * 3. 소문자로 변환
 * 4. 앞뒤 공백 제거
 *
 * @param query 원본 검색 쿼리
 * @returns 전처리된 검색 쿼리
 */
export function preprocessSearchQuery(query: string): string {
  return query
    .replace(/[。、！？!?.,;:~・]/g, "") // 구두점 제거
    .replace(/\s+/g, " ") // 연속 공백 → 단일 공백
    .toLowerCase() // 소문자 변환
    .trim(); // 앞뒤 공백 제거
}
