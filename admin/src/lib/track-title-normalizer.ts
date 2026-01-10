/**
 * 스포티파이 트랙 제목을 정규화하는 함수
 *
 * 동작:
 * 1. 변형 버전 패턴 제거 (라이브, 리믹스, 인스트루멘탈 등)
 * 2. 공백, 괄호, 하이픈 등 제거
 * 3. 소문자 변환
 *
 * @param title - 정규화할 트랙 제목
 * @returns 정규화된 제목
 */
export function normalizeTitle(title: string): string {
  let normalized = title;

  // 변형 버전 패턴 제거 (isDuplicateTrack과 동일한 패턴들)
  const patternsToRemove = [
    // 하이픈으로 감싼 부제목 제거 (예: "-We will B-")
    /-[^-]+-(?=\s)/g, // "- XXX -" 패턴 (뒤에 공백 있을 때)

    // 버전 표시
    /\(alt ver\.?\)/gi,
    /\(ver\.?\)/gi,
    /\(version\)/gi,
    /- alternate version/gi,
    /- .+ ver\.?$/gi, // "- XX Ver." 패턴 (끝에만)
    /live ver\.?$/gi, // "Live ver." 패턴 (단독, 끝에만)

    // 라이브
    /- live at [^\-()[\]]+/gi, // "- Live at Tokyo" 전체 매칭
    /- live($|\s)/gi,
    /\(live\)/gi,
    /\[live\]/gi,
    /\(live at\s.+\)/gi,
    /\/\s*LIVE/gi,

    // 인스트루멘탈
    /- instrumental/gi,
    /\(instrumental\)/gi,
    /\[instrumental\]/gi,
    /- inst\.?/gi,
    /\(inst\.?\)/gi,
    /-instrumental-/gi,

    // 리믹스
    /- remix($|\s)/gi,
    /\(remix\)/gi,
    /- .+ remix/gi,
    /\(.+ remix\)/gi,
    /- .+ mix/gi,

    // 보컬 제거
    /- off vocal/gi,
    /\(off vocal\)/gi,
    /\[off vocal\]/gi,

    // 출처 표시
    /- from\s.+/gi,
    /\(from\s.+\)/gi,
    /\[from\s.+\]/gi,

    // 특별 편곡
    /\[with\s.+\]/gi,
    /\(with\s.+\)/gi,
    /- with\s.+/gi,

    // 짧은 버전
    /- tv size/gi,
    /\(tv size\)/gi,
    /\[tv size\]/gi,
    /- short ver\.?/gi,
    /\(short ver\.?\)/gi,
    /- radio edit/gi,
    /\(radio edit\)/gi,

    // 재녹음/재발매
    /[(（]re[:：].+[)）]/gi,

    // 괄호 안 모든 내용 제거 (위 패턴에서 안 걸린 것들)
    /\([^)]*\)/g,   // 소괄호
    /\[[^\]]*\]/g,  // 대괄호
    /\{[^}]*\}/g,   // 중괄호
  ];

  for (const pattern of patternsToRemove) {
    normalized = normalized.replace(pattern, "");
  }

  // 소문자 변환 (ASCII 알파벳만)
  normalized = normalized.toLowerCase();

  // 공백, 괄호, 하이픈, 특수문자 등 제거
  normalized = normalized
    .replace(/[\s\-_()[\]{}・~]/g, "")
    .trim();

  return normalized;
}
