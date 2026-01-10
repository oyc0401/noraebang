/**
 * Song(TJ)과 SpotifyTrack 매칭 알고리즘
 *
 * Levenshtein distance 기반 문자열 유사도 계산
 */

/**
 * Levenshtein distance 계산
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 문자열 유사도 (0~1)
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Song 제목과 가장 유사한 Spotify 트랙 찾기
 *
 * @param songTitle - TJ 노래 제목
 * @param spotifyTitles - Spotify 트랙 제목 배열
 * @returns 가장 유사한 트랙 제목, 유사도가 낮으면 null
 */
export function findBestMatch(
  songTitle: string,
  spotifyTitles: string[],
): string | null {
  let bestMatch = "";
  let bestScore = 0;

  for (const spotifyTitle of spotifyTitles) {
    if (!spotifyTitle) continue;

    const score = similarity(songTitle, spotifyTitle);

    if (score > bestScore) {
      bestMatch = spotifyTitle;
      bestScore = score;
    }
  }

  // 유사도가 일정 수준 이상일 때만 반환 (임계값: 0.6)
  const THRESHOLD = 0.6;
  return bestScore >= THRESHOLD ? bestMatch : null;
}
