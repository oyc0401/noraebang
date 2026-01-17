import { prisma } from "../prisma";

export interface CreateSongsFromSpotifyGroupsOptions {
  dryRun?: boolean;
  verbose?: boolean;
  /** 특정 그룹 ID들만 처리 (없으면 모든 미연결 그룹) */
  groupIds?: number[];
}

export interface CreatedSongInfo {
  songId: number;
  groupId: number;
  title: string;
  titleKo: string | null;
  titleJa: string | null;
  thumbnailSource: string | null;
}

export interface CreateSongsFromSpotifyGroupsResult {
  artistId: number;
  artistName: string;
  stats: {
    totalGroups: number;
    created: number;
    skipped: number;
    failed: number;
  };
  created: CreatedSongInfo[];
  /** dry run일 때 미리보기용 */
  preview: Array<{
    groupId: number;
    title: string;
    titleKo: string | null;
    titleJa: string | null;
    trackCount: number;
  }>;
}

// 언어 감지 유틸리티
function containsJapanese(text: string): boolean {
  // 히라가나, 가타카나
  return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

function containsKorean(text: string): boolean {
  // 한글 음절, 자모
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text);
}

type TitleWithPopularity = {
  text: string;
  popularity: number;
};

/**
 * 특정 아티스트의 미연결 SpotifyTrackGroup들을 바탕으로 Song을 생성합니다.
 *
 * - title: 일본어 우선 (없으면 가장 인기 높은 것)
 * - titleKo: 한국어가 있으면
 * - titleJa: 일본어가 감지되면
 * - 썸네일: 그룹 내 가장 오래된 트랙의 썸네일
 */
export async function createSongsFromSpotifyGroups(
  artistId: number,
  options: CreateSongsFromSpotifyGroupsOptions = {},
): Promise<CreateSongsFromSpotifyGroupsResult> {
  const { dryRun = false, verbose = false, groupIds: targetGroupIds } = options;
  const log = verbose ? console.log : () => {};

  // 1. 아티스트 정보 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      spotifyId: true,
      homeCatalog: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  if (!artist.spotifyId) {
    throw new Error(`Artist #${artistId} has no spotifyId`);
  }

  log(`\n[Artist #${artist.id}] ${artist.name}`);
  if (dryRun) log(`  🔍 DRY-RUN MODE`);

  // 2. 아티스트의 스포티파이 트랙 그룹 조회 (Song에 연결되지 않은 것만)
  const artistTracks = await prisma.spotifyArtistTrack.findMany({
    where: {
      spotifyArtist: { spotifyId: artist.spotifyId },
    },
    select: {
      spotifyTrack: {
        select: {
          groupId: true,
        },
      },
    },
  });

  const groupIds = [
    ...new Set(
      artistTracks
        .map((t) => t.spotifyTrack?.groupId)
        .filter((id): id is number => id !== null && id !== undefined),
    ),
  ];

  if (groupIds.length === 0) {
    log(`  → 스포티파이 그룹 없음`);
    return {
      artistId: artist.id,
      artistName: artist.name,
      stats: { totalGroups: 0, created: 0, skipped: 0, failed: 0 },
      created: [],
      preview: [],
    };
  }

  // 이미 Song에 연결된 그룹 ID들
  const linkedGroupIds = await prisma.song.findMany({
    where: {
      spotifyTrackGroupId: { in: groupIds },
    },
    select: { spotifyTrackGroupId: true },
  });
  const linkedSet = new Set(linkedGroupIds.map((s) => s.spotifyTrackGroupId));

  // 미연결 그룹만 필터링
  let unlinkedGroupIds = groupIds.filter((id) => !linkedSet.has(id));

  // targetGroupIds가 지정되면 해당 그룹만 처리
  if (targetGroupIds && targetGroupIds.length > 0) {
    const targetSet = new Set(targetGroupIds);
    unlinkedGroupIds = unlinkedGroupIds.filter((id) => targetSet.has(id));
  }

  log(`  → 전체 그룹: ${groupIds.length}개, 미연결: ${unlinkedGroupIds.length}개`);

  if (unlinkedGroupIds.length === 0) {
    return {
      artistId: artist.id,
      artistName: artist.name,
      stats: { totalGroups: groupIds.length, created: 0, skipped: groupIds.length, failed: 0 },
      created: [],
      preview: [],
    };
  }

  // 3. 미연결 그룹들의 트랙 정보 조회
  const groups = await prisma.spotifyTrackGroup.findMany({
    where: { id: { in: unlinkedGroupIds } },
    select: {
      id: true,
      tracks: {
        select: {
          id: true,
          name: true,
          musicBrainzTitle: true,
          popularity: true,
          releaseDate: true,
          thumbnails: true,
        },
        orderBy: { releaseDate: "asc" },
      },
    },
  });

  const stats = {
    totalGroups: groupIds.length,
    created: 0,
    skipped: linkedSet.size,
    failed: 0,
  };
  const created: CreatedSongInfo[] = [];
  const preview: CreateSongsFromSpotifyGroupsResult["preview"] = [];

  // 4. 각 그룹에서 Song 생성
  for (const group of groups) {
    try {
      const { title, titleKo, titleJa } = extractTitles(group.tracks);

      // 썸네일: 가장 오래된 트랙 (이미 releaseDate asc 정렬됨)
      const oldestTrack = group.tracks[0];
      const thumbs = oldestTrack?.thumbnails ?? [];
      const thumbnailHigh = thumbs[0] ?? null;
      const thumbnailMedium = thumbs[1] ?? thumbs[0] ?? null;
      const thumbnailDefault = thumbs[2] ?? thumbs[1] ?? thumbs[0] ?? null;

      if (dryRun) {
        preview.push({
          groupId: group.id,
          title,
          titleKo,
          titleJa,
          trackCount: group.tracks.length,
        });
        log(`     [Group #${group.id}] "${title}" (Ko: ${titleKo ?? "-"}, Ja: ${titleJa ?? "-"}) - ${group.tracks.length}트랙`);
      } else {
        // Song 생성 + 아티스트 연결
        const song = await prisma.song.create({
          data: {
            title,
            titleKo,
            titleJa,
            catalog: artist.homeCatalog,
            spotifyTrackGroupId: group.id,
            thumbnailDefault,
            thumbnailMedium,
            thumbnailHigh,
            artistSongs: {
              create: {
                artistId,
                order: 0,
              },
            },
          },
          select: { id: true },
        });

        created.push({
          songId: song.id,
          groupId: group.id,
          title,
          titleKo,
          titleJa,
          thumbnailSource: oldestTrack?.releaseDate ?? null,
        });
        stats.created++;
        log(`     ✅ [Song #${song.id}] "${title}" <- [Group #${group.id}]`);
      }
    } catch (error) {
      stats.failed++;
      log(`     ❌ [Group #${group.id}] 실패: ${error}`);
    }
  }

  log(`\n  → 결과: 생성 ${stats.created}개, 스킵 ${stats.skipped}개, 실패 ${stats.failed}개`);

  return {
    artistId: artist.id,
    artistName: artist.name,
    stats,
    created,
    preview,
  };
}

/**
 * 트랙 목록에서 title, titleKo, titleJa를 추출합니다.
 *
 * 규칙:
 * - 모든 트랙의 name과 musicBrainzTitle을 수집
 * - 언어 감지: 일본어(히라가나/가타카나), 한국어(한글)
 * - title: 일본어 우선, 없으면 가장 인기 높은 것
 * - titleKo: 한국어가 있으면
 * - titleJa: 일본어가 감지되면
 * - 같은 언어가 여러 개면 인기도 높은 것 우선
 */
function extractTitles(
  tracks: Array<{
    name: string;
    musicBrainzTitle: string | null;
    popularity: number | null;
  }>,
): { title: string; titleKo: string | null; titleJa: string | null } {
  // 모든 타이틀 후보 수집 (인기도와 함께)
  const candidates: TitleWithPopularity[] = [];

  for (const track of tracks) {
    const popularity = track.popularity ?? 0;

    // Spotify name
    if (track.name) {
      candidates.push({ text: track.name, popularity });
    }

    // MusicBrainz title
    if (track.musicBrainzTitle && track.musicBrainzTitle !== track.name) {
      candidates.push({ text: track.musicBrainzTitle, popularity });
    }
  }

  if (candidates.length === 0) {
    return { title: "Unknown", titleKo: null, titleJa: null };
  }

  // 인기도 내림차순 정렬
  candidates.sort((a, b) => b.popularity - a.popularity);

  // 언어별로 분류
  const japaneseTitles: TitleWithPopularity[] = [];
  const koreanTitles: TitleWithPopularity[] = [];

  for (const c of candidates) {
    if (containsJapanese(c.text)) {
      japaneseTitles.push(c);
    } else if (containsKorean(c.text)) {
      koreanTitles.push(c);
    }
  }

  // title 결정: 일본어 우선, 없으면 가장 인기 높은 것
  let title: string;
  if (japaneseTitles.length > 0) {
    title = japaneseTitles[0].text;
  } else {
    title = candidates[0].text;
  }

  // titleKo: 한국어가 있으면 (가장 인기 높은 것)
  const titleKo = koreanTitles.length > 0 ? koreanTitles[0].text : null;

  // titleJa: 일본어가 감지되면 (title과 다른 경우에만, 또는 title이 일본어가 아닌 경우)
  let titleJa: string | null = null;
  if (japaneseTitles.length > 0) {
    // title이 이미 일본어면 titleJa는 null (중복 방지)
    // 단, title과 다른 일본어가 있으면 넣어줄 수도 있지만, 보통은 같으므로 null
    if (!containsJapanese(title)) {
      titleJa = japaneseTitles[0].text;
    } else {
      // title이 일본어면, titleJa에도 같은 값 (사용자 요청에 따라)
      titleJa = title;
    }
  }

  return { title, titleKo, titleJa };
}
