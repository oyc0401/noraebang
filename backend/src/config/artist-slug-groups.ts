/**
 * 아티스트 별칭 그룹 설정
 * 같은 인물이 여러 이름으로 활동하는 경우, 여기에 별칭 그룹을 정의합니다.
 *
 * 각 그룹의 아티스트들은 서로의 곡을 공유합니다.
 * 예: tayori 페이지에서 islet의 곡도 함께 표시됩니다.
 */

export interface ArtistSlugGroup {
  // 그룹 ID (설명용)
  groupId: string;
  // 그룹에 속한 아티스트 슬러그들
  slugs: string[];
}

// 아티스트 슬러그 그룹 목록
export const ARTIST_SLUG_GROUPS: ArtistSlugGroup[] = [
  {
    groupId: "tayori-islet",
    slugs: ["tayori", "islet"],
  },
  // 필요시 여기에 다른 별칭 그룹 추가
  // {
  //   groupId: 'example-group',
  //   slugs: ['artist1', 'artist2', 'artist3'],
  // },
];

/**
 * 주어진 아티스트 슬러그의 모든 슬러그를 반환합니다.
 * 그룹에 속하지 않으면 자기 자신만 반환합니다.
 */
export function getArtistSlugs(slug: string): string[] {
  for (const group of ARTIST_SLUG_GROUPS) {
    if (group.slugs.includes(slug)) {
      return group.slugs;
    }
  }
  return [slug];
}

/**
 * 주어진 아티스트 ID의 모든 슬러그 ID들을 반환합니다.
 */
export function getSlugArtistIds(
  artistId: number,
  artistSlug?: string,
): number[] {
  // slug가 없으면 자기 자신만 반환
  if (!artistSlug) {
    return [artistId];
  }

  // 슬러그 그룹에 속하는지 확인
  const slugGroup = ARTIST_SLUG_GROUPS.find((group) =>
    group.slugs.includes(artistSlug),
  );

  // 그룹에 속하지 않으면 자기 자신만 반환
  if (!slugGroup) {
    return [artistId];
  }

  // 그룹의 모든 슬러그를 반환 (실제 ID 매핑은 서비스에서 처리)
  return slugGroup.slugs.map(() => artistId); // placeholder
}
