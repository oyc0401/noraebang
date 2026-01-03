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
 * Featuring, produced by 같은 변형도 지원
 */
function extractWithBalancedParentheses(
  text: string,
  pattern: "Feat" | "Prod",
): { matches: string[]; cleaned: string } {
  const matches: string[] = [];
  let cleaned = text;

  // Feat: Feat. 또는 Featuring
  // Prod: Prod. 또는 produced by
  const patterns = pattern === "Feat"
    ? ["\\(Feat\\.", "\\(Featuring\\s+"]
    : ["\\(Prod\\.", "\\(produced by\\s+"];

  for (const regexPattern of patterns) {
    const regex = new RegExp(regexPattern, "gi");
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
        if (cleaned[endIndex] === "(") {
          depth++;
        } else if (cleaned[endIndex] === ")") {
          depth--;
        }
        endIndex++;
      }

      if (depth === 0) {
        // 괄호 안의 내용 추출
        const content = cleaned.slice(contentStart, endIndex - 1).trim();

        // & 기호와 쉼표로 분리하여 여러 아티스트 처리
        const items = content
          .split(/[,&]/)
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

  if (!tjArtist || tjArtist.trim() === "") {
    return result;
  }

  let remaining = tjArtist.trim();

  // 1. Feat. 괄호 추출 (중첩 괄호 지원, Featuring 포함)
  const featResult = extractWithBalancedParentheses(remaining, "Feat");
  result.feature.push(...featResult.matches);
  remaining = featResult.cleaned;

  // 2. Prod. 괄호 추출 (중첩 괄호 지원, produced by 포함)
  const prodResult = extractWithBalancedParentheses(remaining, "Prod");
  result.producer.push(...prodResult.matches);
  remaining = prodResult.cleaned;

  // 3. Prod & Feat. 복합 케이스 처리
  // (Prod & Feat. XXX) 패턴 찾기
  remaining = remaining.replace(/\(Prod\s*&\s*Feat\.\s*([^)]+)\)/gi, (match, content) => {
    const items = content.trim().split(/[,&]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    result.feature.push(...items);
    result.producer.push(...items);
    return "";
  });

  // 4. With 키워드 제거
  remaining = remaining.replace(/\(With\s+[^)]+\)/gi, "");

  // 5. 괄호 안 멤버명/Solo 패턴 제거
  // 패턴: (멤버1 & 멤버2), (멤버 Solo), (G.D & T.O.P) 등
  // 단, 첫 번째 괄호는 유지 (별명/영문명)
  remaining = remaining.replace(/(\([^)]+\))\(([^)]*(?:&|Solo)[^)]*)\)/gi, "$1");
  remaining = remaining.replace(/^([^(]+)\(([^)]*(?:&|Solo)[^)]*)\)/gi, "$1");

  // 6. 괄호 depth를 고려하여 쉼표와 & 기호로 분리
  const artists: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < remaining.length; i++) {
    const char = remaining[i];

    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
    } else if ((char === "," || char === "&") && depth === 0) {
      // 괄호 밖의 쉼표와 & 기호만 구분자로 사용
      const trimmed = current.trim().replace(/\s*외\s+\d+명\s*$/, "");
      if (trimmed.length > 0) {
        artists.push(trimmed);
      }
      current = "";
    } else {
      current += char;
    }
  }

  // 마지막 아티스트 추가
  const trimmed = current.trim().replace(/\s*외\s+\d+명\s*$/, "");
  if (trimmed.length > 0) {
    artists.push(trimmed);
  }

  result.artist.push(...artists);

  return result;
}

/**
 * 작사가 문자열을 파싱하여 배열로 반환
 * @param lyricist - 작사가 문자열 (쉼표로 구분)
 * @returns 작사가 배열
 */
export function parseLyricist(lyricist: string): string[] {
  if (!lyricist || lyricist.trim() === "") {
    return [];
  }

  return lyricist
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 작곡가 문자열을 파싱하여 배열로 반환
 * @param composer - 작곡가 문자열 (쉼표로 구분)
 * @returns 작곡가 배열
 */
export function parseComposer(composer: string): string[] {
  if (!composer || composer.trim() === "") {
    return [];
  }

  return composer
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
