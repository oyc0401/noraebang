/**
 * 스포티파이 트랙 제목이 중복 트랙인지 판단하는 함수
 *
 * 중복으로 판단하는 패턴:
 * - (alt ver.), (Ver.), (Version) 등 버전 표시
 * - - Live, (Live), - Live at, Live ver. 등 라이브 버전
 * - - Instrumental, (Instrumental), - Inst., -instrumental- 등 인스트루멘탈
 * - - Remix, (Remix), - XX Remix 등 리믹스
 * - - OFF VOCAL, (OFF VOCAL) 등 보컬 제거 버전
 * - - from "...", (from ...) 등 출처 표시
 * - [with ...], (with ...), - with ... 등 특별 편곡
 *
 * @param trackName - 스포티파이 트랙 제목
 * @returns 중복 트랙이면 true, 아니면 false
 */
export function isDuplicateTrack(trackName: string): boolean {
  if (!trackName || trackName.trim() === "") {
    return false;
  }

  // 버전 표시 패턴
  const versionPatterns = [
    /\(alt ver\.?\)/i,
    /\(ver\.?\)/i,
    /\(version\)/i,
    /- alternate version/i,
  ];

  // 라이브 버전 패턴
  const livePatterns = [
    /- live($|\s)/i,
    /\(live\)/i,
    /\[live\]/i,
    /- live at\s/i,
    /\(live at\s/i,
    /live ver\.?$/i, // 일본 곡 패턴
  ];

  // 인스트루멘탈 패턴
  const instrumentalPatterns = [
    /- instrumental/i,
    /\(instrumental\)/i,
    /\[instrumental\]/i,
    /- inst\.?/i,
    /\(inst\.?\)/i,
    /-instrumental-/i, // 일본 곡 패턴
  ];

  // 리믹스 패턴
  const remixPatterns = [
    /- remix/i,
    /\(remix\)/i,
    /- \w+ remix/i,
    /\(\w+ remix\)/i,
  ];

  // 보컬 제거 패턴
  const offVocalPatterns = [
    /- off vocal/i,
    /\(off vocal\)/i,
    /\[off vocal\]/i,
  ];

  // 출처 표시 패턴
  const fromPatterns = [
    /- from\s/i,
    /\(from\s/i,
    /\[from\s/i,
  ];

  // 특별 편곡 패턴 (with가 끝부분에 있는 경우만)
  const withPatterns = [
    /\[with\s/i,
    /\(with\s/i,
    /- with\s/i,
  ];

  // 모든 패턴 결합
  const allPatterns = [
    ...versionPatterns,
    ...livePatterns,
    ...instrumentalPatterns,
    ...remixPatterns,
    ...offVocalPatterns,
    ...fromPatterns,
    ...withPatterns,
  ];

  // 하나라도 매칭되면 중복으로 판단
  return allPatterns.some((pattern) => pattern.test(trackName));
}
