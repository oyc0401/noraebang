/**
 * 스포티파이 트랙 제목이 중복 트랙인지 판단하는 함수
 *
 * 중복으로 판단하는 패턴:
 * - (alt ver.), (Ver.), (Version), - XX Ver. 등 버전 표시
 * - - Live, (Live), - Live at, Live ver. 등 라이브 버전
 * - - Instrumental, (Instrumental), - Inst., -instrumental- 등 인스트루멘탈
 * - - Remix, (Remix), - XX Remix, - XX Mix 등 리믹스
 * - - OFF VOCAL, (OFF VOCAL) 등 보컬 제거 버전
 * - - from "...", (from ...) 등 출처 표시
 * - [with ...], (with ...), - with ... 등 특별 편곡
 * - - TV Size, (TV Size), - Short Ver., - Radio Edit 등 짧은 버전
 * - (Re:...), (Re：...) 등 재녹음/재발매 버전
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
    /- .+ ver\.?$/i, // "- XX Ver." 패턴 (일본 곡)
  ];

  // 라이브 버전 패턴
  const livePatterns = [
    /- live($|\s)/i,
    /\(live\)/i,
    /\[live\]/i,
    /- live at\s/i,
    /\(live at\s/i,
    /live ver\.?$/i, // 일본 곡 패턴
    /\/\s*LIVE/i,
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
    /- remix($|\s)/i, // "- Remix"
    /\(remix\)/i, // "(Remix)"
    /- .+ remix/i, // "- XX Remix", "- Sasuke Haraguchi Remix"
    /\(.+ remix\)/i, // "(XX Remix)"
    /- .+ mix/i, // "- 30th Anniversary Mix"
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

  // 짧은 버전 패턴
  const shortVersionPatterns = [
    /- tv size/i,
    /\(tv size\)/i,
    /\[tv size\]/i,
    /- short ver\.?/i,
    /\(short ver\.?\)/i,
    /- radio edit/i,
    /\(radio edit\)/i,
  ];

  // 재녹음/재발매 패턴
  const reRecordPatterns = [
    /[(（]re[:：]/i, // (Re:), (Re：)
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
    ...shortVersionPatterns,
    ...reRecordPatterns,
  ];

  // 하나라도 매칭되면 중복으로 판단
  return allPatterns.some((pattern) => pattern.test(trackName));
}
