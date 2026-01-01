/**
 * TJ 아티스트 문자열 파싱 결과
 */
export interface ParsedArtists {
  artist: string[];
  feature: string[];
  producer: string[];
}

/**
 * 중첩된 괄호를 지원하는 Feat./Prod. 추출
 * 예: (Feat.Marochi(마로치)) → Marochi(마로치)
 */
function extractWithBalancedParentheses(
  text: string,
  pattern: 'Feat' | 'Prod',
): { matches: string[]; cleaned: string } {
  const matches: string[] = [];
  let cleaned = text;
  const regex = new RegExp(`\\(${pattern}\\.`, 'gi');
  let searchFrom = 0;

  while (true) {
    const match = regex.exec(cleaned.slice(searchFrom));
    if (!match) break;

    const startIndex = searchFrom + match.index;
    const contentStart = startIndex + match[0].length;

    // 괄호 깊이를 추적하여 닫는 괄호 찾기
    let depth = 1;
    let endIndex = contentStart;

    while (endIndex < cleaned.length && depth > 0) {
      if (cleaned[endIndex] === '(') {
        depth++;
      } else if (cleaned[endIndex] === ')') {
        depth--;
      }
      endIndex++;
    }

    if (depth === 0) {
      // 괄호 안의 내용 추출
      const content = cleaned.slice(contentStart, endIndex - 1).trim();

      // 쉼표로 분리하여 여러 아티스트 처리
      const items = content
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      matches.push(...items);

      // 해당 부분 제거
      cleaned = cleaned.slice(0, startIndex) + cleaned.slice(endIndex);

      // 다음 검색은 제거된 부분부터 시작
      searchFrom = startIndex;
      regex.lastIndex = 0;
    } else {
      break;
    }
  }

  return { matches, cleaned };
}

/**
 * TJ 아티스트 문자열을 파싱하여 아티스트, 피처링, 프로듀서로 분리
 *
 * @param tjArtist - TJ 미디어의 아티스트 문자열
 * @returns 파싱된 아티스트, 피처링, 프로듀서 배열
 *
 * @example
 * ```ts
 * parseTJArtist('먼데이키즈,DK(디셈버),유회승')
 * // { artist: ['먼데이키즈', 'DK(디셈버)', '유회승'], feature: [], producer: [] }
 *
 * parseTJArtist('여로(Feat.이효운)')
 * // { artist: ['여로'], feature: ['이효운'], producer: [] }
 *
 * parseTJArtist('백아연(Prod.윤현상)')
 * // { artist: ['백아연'], feature: [], producer: ['윤현상'] }
 *
 * parseTJArtist('TimeFeveR(타임피버)(Feat.스카이민혁)(Prod.HOWOW)')
 * // { artist: ['TimeFeveR(타임피버)'], feature: ['스카이민혁'], producer: ['HOWOW'] }
 * ```
 */
export function parseTJArtist(tjArtist: string): ParsedArtists {
  const result: ParsedArtists = {
    artist: [],
    feature: [],
    producer: [],
  };

  if (!tjArtist || tjArtist.trim() === '') {
    return result;
  }

  let remaining = tjArtist.trim();

  // 1. Feat. 괄호 추출 (중첩 괄호 지원)
  const featResult = extractWithBalancedParentheses(remaining, 'Feat');
  result.feature.push(...featResult.matches);
  remaining = featResult.cleaned;

  // 2. Prod. 괄호 추출 (중첩 괄호 지원)
  const prodResult = extractWithBalancedParentheses(remaining, 'Prod');
  result.producer.push(...prodResult.matches);
  remaining = prodResult.cleaned;

  // 3. 쉼표로 분리하여 아티스트 추출 (일반 괄호는 아티스트명에 포함)
  const artists = remaining
    .split(',')
    .map((a) => a.trim())
    .map((a) => a.replace(/\s*외\s+\d+명\s*$/, '')) // "외 X명" 패턴 제거
    .filter((a) => a.length > 0);

  result.artist.push(...artists);

  return result;
}

/**
 * 작사가 문자열을 파싱하여 배열로 반환
 * @param lyricist - 작사가 문자열 (쉼표로 구분)
 * @returns 작사가 배열
 */
export function parseLyricist(lyricist: string): string[] {
  if (!lyricist || lyricist.trim() === '') {
    return [];
  }

  return lyricist
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 작곡가 문자열을 파싱하여 배열로 반환
 * @param composer - 작곡가 문자열 (쉼표로 구분)
 * @returns 작곡가 배열
 */
export function parseComposer(composer: string): string[] {
  if (!composer || composer.trim() === '') {
    return [];
  }

  return composer
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
