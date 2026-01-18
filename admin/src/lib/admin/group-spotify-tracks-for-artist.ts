import { prisma } from "../prisma";
import { normalizeTitle } from "../track-title-normalizer";

export interface GroupSpotifyTracksForArtistOptions {
  dryRun?: boolean;
}

type TrackInfo = {
  id: number;
  spotifyId: string;
  name: string;
  musicBrainzTitle: string | null;
  popularity: number | null;
  groupId: number | null;
  releaseDate: string | null;
};

function popularityScore(p: number | null | undefined): number {
  return typeof p === "number" ? p : -1;
}

function pickPrimaryByPopularity(tracks: TrackInfo[]): TrackInfo {
  return tracks.slice().sort((a, b) => {
    const pa = popularityScore(a.popularity);
    const pb = popularityScore(b.popularity);
    if (pa !== pb) return pb - pa;

    if (a.releaseDate && b.releaseDate) {
      return b.releaseDate.localeCompare(a.releaseDate);
    }
    if (a.releaseDate && !b.releaseDate) return -1;
    if (!a.releaseDate && b.releaseDate) return 1;

    return a.id - b.id;
  })[0]!;
}

/**
 * 특정 아티스트의 미연결 스포티파이 트랙들을 그룹화합니다.
 *
 * 규칙:
 * 1. 같은 아티스트 내에서 track.name 또는 musicBrainzTitle이 동일한 트랙들을 그룹화
 * 2. 이미 그룹에 속한 트랙은 제외
 * 3. popularity가 가장 높은 트랙을 primary로 설정
 */
export async function groupSpotifyTracksForArtist(
  artistId: number,
  options: GroupSpotifyTracksForArtistOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  // 1. 아티스트 정보 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      spotifyId: true,
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

  // 3. 해당 아티스트의 트랙 조회
  const links = await prisma.spotifyArtistTrack.findMany({
    where: { spotifyArtistId: spotifyArtist.id },
    select: {
      spotifyTrack: {
        select: {
          id: true,
          spotifyId: true,
          name: true,
          musicBrainzTitle: true,
          popularity: true,
          groupId: true,
          releaseDate: true,
        },
      },
    },
  });

  const stats = {
    totalTracks: links.length,
    alreadyGrouped: 0,
    targetTracks: 0,
    groupsCreated: 0,
    groupsMerged: 0,
    tracksUpdated: 0,
    primaryUpdated: 0,
  };

  // 4. 그룹화 대상 트랙 필터링 (groupId가 null인 것만)
  const tracks: TrackInfo[] = [];

  for (const link of links) {
    const t = link.spotifyTrack;
    if (t.groupId !== null) {
      stats.alreadyGrouped++;
      continue;
    }

    tracks.push({
      id: t.id,
      spotifyId: t.spotifyId,
      name: t.name,
      musicBrainzTitle: t.musicBrainzTitle,
      popularity: t.popularity,
      groupId: t.groupId,
      releaseDate: t.releaseDate,
    });
  }

  stats.targetTracks = tracks.length;

  console.log(`  → 전체 트랙: ${stats.totalTracks}개, 이미 그룹화: ${stats.alreadyGrouped}개, 대상: ${stats.targetTracks}개`);

  if (tracks.length === 0) {
    console.log("  → 그룹화할 트랙이 없습니다.");
    return;
  }

  // 5. Union-Find로 같은 제목 트랙 그룹화
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

  // 제목별 트랙 ID 매핑
  const titleToTrackIds = new Map<string, number[]>();

  for (const track of tracks) {
    const normalizedName = normalizeTitle(track.name);
    const nameList = titleToTrackIds.get(normalizedName) ?? [];
    nameList.push(track.id);
    titleToTrackIds.set(normalizedName, nameList);

    if (track.musicBrainzTitle) {
      const normalizedMb = normalizeTitle(track.musicBrainzTitle);
      if (normalizedMb !== normalizedName) {
        const mbList = titleToTrackIds.get(normalizedMb) ?? [];
        mbList.push(track.id);
        titleToTrackIds.set(normalizedMb, mbList);
      }
    }
  }

  // 같은 제목 트랙들 union
  for (const trackIds of titleToTrackIds.values()) {
    if (trackIds.length <= 1) continue;
    for (let i = 1; i < trackIds.length; i++) {
      union(trackIds[0], trackIds[i]);
    }
  }

  // 그룹별로 트랙 모으기
  const groupedTracks = new Map<number, TrackInfo[]>();

  for (const track of tracks) {
    const root = find(track.id);
    const list = groupedTracks.get(root) ?? [];
    list.push(track);
    groupedTracks.set(root, list);
  }

  type GroupInfo = {
    tracks: TrackInfo[];
    primary: TrackInfo;
  };

  const groupsToCreate: GroupInfo[] = [];

  for (const group of groupedTracks.values()) {
    if (group.length === 0) continue;
    const primary = pickPrimaryByPopularity(group);
    groupsToCreate.push({ tracks: group, primary });
  }

  console.log(`  → 생성할 그룹: ${groupsToCreate.length}개`);

  if (dryRun) {
    for (const g of groupsToCreate) {
      const titles = new Set<string>();
      for (const t of g.tracks) {
        titles.add(t.name);
        if (t.musicBrainzTitle) titles.add(t.musicBrainzTitle);
      }

      console.log(`     [그룹] "${Array.from(titles).join(" / ")}" (${g.tracks.length}트랙, primary: ${g.primary.name})`);
    }

    console.log("  • DRY-RUN: 새로운 그룹 예상 목록을 출력했습니다.");
    return;
  }

  // 6. DB 업데이트
  for (const group of groupsToCreate) {
    // 새 그룹 생성
    const newGroup = await prisma.spotifyTrackGroup.create({
      data: {},
    });
    stats.groupsCreated++;

    // 트랙들 그룹에 연결
    const trackIds = group.tracks.map((t) => t.id);
    await prisma.spotifyTrack.updateMany({
      where: { id: { in: trackIds } },
      data: { groupId: newGroup.id },
    });
    stats.tracksUpdated += trackIds.length;

    // Primary 설정
    await prisma.spotifyTrackGroup.update({
      where: { id: newGroup.id },
      data: { primarySpotifyTrackId: group.primary.id },
    });
    stats.primaryUpdated++;

    console.log(`     ✅ [Group #${newGroup.id}] "${group.primary.name}" (${group.tracks.length}트랙)`);
  }

  console.log(`\n  → 결과: 그룹 생성 ${stats.groupsCreated}개, 트랙 업데이트 ${stats.tracksUpdated}개`);
}
