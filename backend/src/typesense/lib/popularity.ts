/**
 * Typesense 검색 인기도 계산 유틸리티
 */

/**
 * 아티스트 인기도 계산
 *
 * @param spotifyPopularity Spotify 인기도 (0-100)
 * @param tjSongCount 해당 아티스트가 가진 곡 중 TJ 노래방 번호가 있는 곡의 개수
 * @returns 최종 인기도 (spotifyPopularity + tjSongCount)
 */
export function calculateArtistPopularity(
  spotifyPopularity: number | undefined | null,
  tjSongCount: number,
): number {
  const basePopularity = spotifyPopularity ?? 0;
  return basePopularity + tjSongCount;
}

interface SongPopularityInput {
  artistPopularity?: number | null;
  spotifyTrackPopularity?: number | null;
  hasTjSong: boolean;
}

/**
 * 곡 인기도 계산
 *
 * @returns artistPopularity + spotifyTrackPopularity + (hasTjSong ? 5 : 0)
 *          단, 아무 정보도 없으면 undefined
 */
export function calculateSongPopularity(
  input: SongPopularityInput,
): number | undefined {
  const { artistPopularity, spotifyTrackPopularity, hasTjSong } = input;
  const hasSource =
    artistPopularity !== undefined && artistPopularity !== null
      ? true
      : spotifyTrackPopularity !== undefined && spotifyTrackPopularity !== null
        ? true
        : hasTjSong;

  if (!hasSource) {
    return undefined;
  }

  const artistScore = artistPopularity ?? 0;
  const trackScore = spotifyTrackPopularity ?? 0;
  const tjBonus = hasTjSong ? 5 : 0;
  return artistScore + trackScore + tjBonus;
}
