/**
 * 아티스트 별칭 그룹 설정
 * 같은 인물이 여러 이름으로 활동하는 경우, 여기에 별칭 그룹을 정의합니다.
 *
 * 각 그룹의 아티스트들은 서로의 곡을 공유합니다.
 * 예: tayori 페이지에서 islet의 곡도 함께 표시됩니다.
 */

export interface ArtistAliasGroup {
  // 그룹 ID (설명용)
  groupId: string;
  // 그룹에 속한 아티스트 별칭들 (alias 필드 값)
  aliases: string[];
}

// 아티스트 별칭 그룹 목록
export const ARTIST_ALIAS_GROUPS: ArtistAliasGroup[] = [
  {
    groupId: "tayori-islet",
    aliases: ["tayori", "islet"],
  },
  // 필요시 여기에 다른 별칭 그룹 추가
  // {
  //   groupId: 'example-group',
  //   aliases: ['artist1', 'artist2', 'artist3'],
  // },
];

/**
 * 주어진 아티스트 별칭의 모든 별칭들을 반환합니다.
 * 별칭 그룹에 속하지 않으면 자기 자신만 반환합니다.
 */
export function getArtistAliases(alias: string): string[] {
  for (const group of ARTIST_ALIAS_GROUPS) {
    if (group.aliases.includes(alias)) {
      return group.aliases;
    }
  }
  return [alias];
}

/**
 * 주어진 아티스트 ID의 모든 별칭 ID들을 반환합니다.
 */
export function getAliasArtistIds(
  artistId: number,
  artistAlias: string | null,
): number[] {
  // alias가 없으면 자기 자신만 반환
  if (!artistAlias) {
    return [artistId];
  }

  // 별칭 그룹에 속하는지 확인
  const aliasGroup = ARTIST_ALIAS_GROUPS.find((group) =>
    group.aliases.includes(artistAlias),
  );

  // 그룹에 속하지 않으면 자기 자신만 반환
  if (!aliasGroup) {
    return [artistId];
  }

  // 그룹의 모든 별칭을 반환 (실제 ID 매핑은 서비스에서 처리)
  return aliasGroup.aliases.map(() => artistId); // placeholder
}
