import { prisma } from "../prisma";

// createSongsFromSpotifyTracks는 특정 아티스트의 미연결 SpotifyTrack들을 바탕으로 Song을 생성합니다.
// - songId가 null인 트랙들을 대상으로 Song 생성
// - 같은 제목(정규화 기준)의 트랙들은 하나의 Song으로 묶음
// - title: 일본어 우선 (없으면 가장 인기 높은 것)
// - titleKo: 한국어가 있으면
// - titleJa: 일본어가 감지되면
// - 썸네일: 가장 인기 높은 트랙의 썸네일

export interface CreateSongsFromSpotifyTracksOptions {
  dryRun?: boolean;
  /** 특정 트랙 ID들만 처리 (없으면 모든 미연결 트랙) */
  trackIds?: number[];
  /** 최소 인기도 (기본값: 0) */
  minPopularity?: number;
}

// 언어 감지 유틸리티
function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text);
}

function normalizeForGrouping(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

type TrackInfo = {
  id: number;
  name: string;
  musicBrainzTitle: string | null;
  popularity: number | null;
  releaseDate: string | null;
  thumbnails: string[];
};

type TitleWithPopularity = {
  text: string;
  popularity: number;
};

/**
 * 특정 아티스트의 미연결 SpotifyTrack들을 바탕으로 Song을 생성합니다.
 */
export async function createSongsFromSpotifyTracks(
  artistId: number,
  options: CreateSongsFromSpotifyTracksOptions = {},
): Promise<void> {
  const { dryRun = false, trackIds: targetTrackIds, minPopularity = 0 } = options;

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

  console.log(`\n[Artist #${artist.id}] ${artist.name}`);
  if (dryRun) console.log(`  🔍 DRY-RUN MODE`);

  // 2. SpotifyArtist 조회
  const spotifyArtist = await prisma.spotifyArtist.findUnique({
    where: { spotifyId: artist.spotifyId },
    select: { id: true },
  });

  if (!spotifyArtist) {
    throw new Error(`SpotifyArtist not found for spotifyId: ${artist.spotifyId}`);
  }

  // 3. 아티스트의 미연결 스포티파이 트랙 조회 (songId가 null인 것만)
  const whereCondition: any = {
    disabled: false,
    songId: null,
    artists: {
      some: { spotifyArtistId: spotifyArtist.id },
    },
  };

  if (minPopularity > 0) {
    whereCondition.popularity = { gte: minPopularity };
  }

  if (targetTrackIds && targetTrackIds.length > 0) {
    whereCondition.id = { in: targetTrackIds };
  }

  const tracks = await prisma.spotifyTrack.findMany({
    where: whereCondition,
    select: {
      id: true,
      name: true,
      musicBrainzTitle: true,
      popularity: true,
      releaseDate: true,
      thumbnails: true,
    },
    orderBy: { popularity: "desc" },
  });

  console.log(`  → 미연결 트랙: ${tracks.length}개`);

  if (tracks.length === 0) {
    console.log("  → Song 생성할 트랙이 없습니다.");
    return;
  }

  // 4. 같은 제목의 트랙들을 그룹화 (정규화 기준)
  const titleToTracks = new Map<string, TrackInfo[]>();

  for (const track of tracks) {
    const normalizedName = normalizeForGrouping(track.name);
    const list = titleToTracks.get(normalizedName) ?? [];
    list.push(track);
    titleToTracks.set(normalizedName, list);

    // musicBrainzTitle도 그룹화에 사용
    if (track.musicBrainzTitle) {
      const normalizedMb = normalizeForGrouping(track.musicBrainzTitle);
      if (normalizedMb !== normalizedName) {
        const mbList = titleToTracks.get(normalizedMb) ?? [];
        mbList.push(track);
        titleToTracks.set(normalizedMb, mbList);
      }
    }
  }

  // Union-Find로 같은 제목 트랙 그룹화
  const parent = new Map<number, number>();

  function find(x: number): number {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: number, y: number) {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX !== rootY) {
      parent.set(rootX, rootY);
    }
  }

  for (const trackList of titleToTracks.values()) {
    if (trackList.length <= 1) continue;
    for (let i = 1; i < trackList.length; i++) {
      union(trackList[0].id, trackList[i].id);
    }
  }

  // 그룹별로 트랙 모으기
  const trackById = new Map<number, TrackInfo>();
  for (const track of tracks) {
    trackById.set(track.id, track);
  }

  const groupedTracks = new Map<number, TrackInfo[]>();
  for (const track of tracks) {
    const root = find(track.id);
    const list = groupedTracks.get(root) ?? [];
    list.push(track);
    groupedTracks.set(root, list);
  }

  const stats = {
    totalTracks: tracks.length,
    songsCreated: 0,
    tracksLinked: 0,
    failed: 0,
  };

  console.log(`  → 생성할 Song: ${groupedTracks.size}개`);

  // 5. 각 그룹에서 Song 생성
  for (const trackGroup of groupedTracks.values()) {
    try {
      const { title, titleKo, titleJa } = extractTitles(trackGroup);

      // 썸네일: 가장 인기 높은 트랙 (이미 popularity desc 정렬됨)
      const mostPopularTrack = trackGroup[0];
      const thumbs = mostPopularTrack?.thumbnails ?? [];
      const thumbnailHigh = thumbs[0] ?? null;
      const thumbnailMedium = thumbs[1] ?? thumbs[0] ?? null;
      const thumbnailDefault = thumbs[2] ?? thumbs[1] ?? thumbs[0] ?? null;

      if (dryRun) {
        console.log(`     [Song] "${title}" (Ko: ${titleKo ?? "-"}, Ja: ${titleJa ?? "-"}) - ${trackGroup.length}트랙`);
        stats.songsCreated++;
        stats.tracksLinked += trackGroup.length;
      } else {
        // Song 생성 + 아티스트 연결
        const song = await prisma.song.create({
          data: {
            title,
            titleKo,
            titleJa,
            catalog: artist.homeCatalog,
            thumbnailDefault,
            thumbnailMedium,
            thumbnailHigh,
            artistSongs: {
              create: {
                artistId,
              },
            },
          },
          select: { id: true },
        });

        // 트랙들의 songId 업데이트
        const trackIds = trackGroup.map((t) => t.id);
        await prisma.spotifyTrack.updateMany({
          where: { id: { in: trackIds } },
          data: { songId: song.id },
        });

        stats.songsCreated++;
        stats.tracksLinked += trackGroup.length;
        console.log(`     ✅ [Song #${song.id}] "${title}" <- ${trackGroup.length}트랙`);
      }
    } catch (error) {
      stats.failed++;
      console.log(`     ❌ 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n  → 결과: Song 생성 ${stats.songsCreated}개, 트랙 연결 ${stats.tracksLinked}개, 실패 ${stats.failed}개`);
  if (dryRun) {
    console.log(`  • DRY-RUN: ${groupedTracks.size}개 Song을 미리보기로 출력했습니다.`);
  }
}

/**
 * 트랙 목록에서 title, titleKo, titleJa를 추출합니다.
 */
function extractTitles(
  tracks: Array<{
    name: string;
    musicBrainzTitle: string | null;
    popularity: number | null;
  }>,
): { title: string; titleKo: string | null; titleJa: string | null } {
  const candidates: TitleWithPopularity[] = [];

  for (const track of tracks) {
    const popularity = track.popularity ?? 0;

    if (track.name) {
      candidates.push({ text: track.name, popularity });
    }

    if (track.musicBrainzTitle && track.musicBrainzTitle !== track.name) {
      candidates.push({ text: track.musicBrainzTitle, popularity });
    }
  }

  if (candidates.length === 0) {
    return { title: "Unknown", titleKo: null, titleJa: null };
  }

  candidates.sort((a, b) => b.popularity - a.popularity);

  const japaneseTitles: TitleWithPopularity[] = [];
  const koreanTitles: TitleWithPopularity[] = [];

  for (const c of candidates) {
    if (containsJapanese(c.text)) {
      japaneseTitles.push(c);
    } else if (containsKorean(c.text)) {
      koreanTitles.push(c);
    }
  }

  let title: string;
  if (japaneseTitles.length > 0) {
    title = japaneseTitles[0].text;
  } else {
    title = candidates[0].text;
  }

  const titleKo = koreanTitles.length > 0 ? koreanTitles[0].text : null;

  let titleJa: string | null = null;
  if (japaneseTitles.length > 0) {
    if (!containsJapanese(title)) {
      titleJa = japaneseTitles[0].text;
    } else {
      titleJa = title;
    }
  }

  return { title, titleKo, titleJa };
}
