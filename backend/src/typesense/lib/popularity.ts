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

/**
 * 곡 인기도 계산
 *
 * @param spotifyPopularity Spotify 인기도 (0-100)
 * @param hasTjSong TJ 노래방 번호 존재 여부
 * @returns 최종 인기도 (spotifyPopularity + (hasTjSong ? 1 : 0))
 */
export function calculateSongPopularity(
  spotifyPopularity: number | undefined | null,
  hasTjSong: boolean,
): number {
  const basePopularity = spotifyPopularity ?? 0;
  const tjBonus = hasTjSong ? 1 : 0;
  return basePopularity + tjBonus;
}
