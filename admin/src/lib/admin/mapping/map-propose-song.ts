import { prisma } from "../../prisma";
import { findBestMatch } from "../../song-spotify-matcher";
import { normalizeTitle } from "../../track-title-normalizer";

interface SongWithTitles {
  id: number;
  title: string;
  titleKo: string | null;
  titleLatin: string | null;
  titleJa: string | null;
  primarySpotifyTrackName: string | null;
}

interface ProposeInfo {
  id: number;
  songTitle: string;
  songSinger: string;
}

interface MappingResultItem {
  propose: ProposeInfo;
  matchedSong: {
    id: number;
    title: string;
    matchedBy: string;
  } | null;
  candidates: Array<{
    id: number;
    title: string;
  }>;
}

export interface MapProposeSongOptions {
  dryRun?: boolean;
}

function pickPrimarySpotifyTrackName(
  tracks: Array<{ name: string; popularity: number | null }>,
): string | null {
  if (tracks.length === 0) return null;

  // popularity 기준 (null은 -1로 취급)
  let best = tracks[0];
  let bestScore = best.popularity ?? -1;

  for (let i = 1; i < tracks.length; i++) {
    const t = tracks[i];
    const score = t.popularity ?? -1;
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best.name ?? null;
}

async function fetchSongsForArtist(
  artistId: number,
): Promise<SongWithTitles[]> {
  const songs = await prisma.song.findMany({
    where: {
      artistSongs: { some: { artistId } },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
      songSpotifyTracks: {
        select: {
          spotifyTrack: {
            select: {
              name: true,
              popularity: true,
            },
          },
        },
      },
    },
  });

  return songs.map((song) => {
    const trackCandidates =
      song.songSpotifyTracks
        ?.map((x) => x.spotifyTrack)
        .filter(
          (t): t is { name: string; popularity: number | null } => !!t?.name,
        ) ?? [];

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      titleJa: song.titleJa,
      primarySpotifyTrackName: pickPrimarySpotifyTrackName(trackCandidates),
    };
  });
}

async function fetchProposesForArtist(
  tjNames: string[],
): Promise<ProposeInfo[]> {
  if (tjNames.length === 0) return [];

  // query 필드로 검색 (검색할 때 사용한 tjName)
  const proposes = await prisma.songPropose.findMany({
    where: {
      songId: null, // 아직 매핑되지 않은 것만 (스키마 기준 FK)
      query: { in: tjNames },
    },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
    },
  });

  return proposes;
}

function generateMapping(
  songs: SongWithTitles[],
  proposes: ProposeInfo[],
): MappingResultItem[] {
  const results: MappingResultItem[] = [];

  if (songs.length === 0 || proposes.length === 0) return results;

  // normalize title -> { song, source }
  const normalizedToSong = new Map<
    string,
    { song: SongWithTitles; source: string }
  >();

  for (const song of songs) {
    const titleSources: Array<[string, string | null | undefined]> = [
      ["title", song.title],
      ["titleKo", song.titleKo],
      ["titleLatin", song.titleLatin],
      ["titleJa", song.titleJa],
      ["primarySpotifyTrackName", song.primarySpotifyTrackName],
    ];

    for (const [source, raw] of titleSources) {
      if (!raw?.trim()) continue;
      const norm = normalizeTitle(raw);
      if (norm && !normalizedToSong.has(norm)) {
        normalizedToSong.set(norm, { song, source });
      }
    }
  }

  const normalizedSongTitles = Array.from(normalizedToSong.keys());

  for (const propose of proposes) {
    const normalizedQuery = normalizeTitle(propose.songTitle);

    if (!normalizedQuery) {
      results.push({ propose, matchedSong: null, candidates: [] });
      continue;
    }

    const result = findBestMatch(normalizedQuery, normalizedSongTitles);

    let matchedSong: MappingResultItem["matchedSong"] = null;
    const candidates: MappingResultItem["candidates"] = [];

    if (result.answer) {
      const matched = normalizedToSong.get(result.answer);
      if (matched) {
        matchedSong = {
          id: matched.song.id,
          title: matched.song.title,
          matchedBy: `${matched.source}: "${propose.songTitle}" -> "${result.answer}"`,
        };
      }
    }

    for (const candidateNorm of result.candidate) {
      const matched = normalizedToSong.get(candidateNorm);
      if (matched && (!matchedSong || matched.song.id !== matchedSong.id)) {
        candidates.push({
          id: matched.song.id,
          title: matched.song.title,
        });
      }
    }

    results.push({ propose, matchedSong, candidates });
  }

  return results;
}

async function applyMapping(
  mappings: MappingResultItem[],
  dryRun: boolean,
): Promise<{ updated: number; failed: number }> {
  const toUpdate: Array<{ proposeId: number; songId: number }> = [];

  for (const mapping of mappings) {
    if (mapping.matchedSong) {
      toUpdate.push({
        proposeId: mapping.propose.id,
        songId: mapping.matchedSong.id,
      });
    }
  }

  if (dryRun) return { updated: 0, failed: 0 };

  let updated = 0;
  let failed = 0;

  for (const item of toUpdate) {
    try {
      await prisma.songPropose.update({
        where: { id: item.proposeId },
        data: { songId: item.songId },
      });
      updated++;
    } catch {
      failed++;
    }
  }

  return { updated, failed };
}

/**
 * 단일 신청곡(SongPropose)을 Song과 매칭합니다.
 *
 * @param proposeId - 신청곡 ID
 * @param artistId - 아티스트 ID (songs 조회용)
 * @returns 매칭된 songId 또는 undefined
 */
export async function mapSinglePropose(
  proposeId: number,
  artistId: number,
): Promise<number | undefined> {
  // 1) propose 조회
  const propose = await prisma.songPropose.findUnique({
    where: { id: proposeId },
    select: { id: true, songTitle: true, songSinger: true, songId: true },
  });

  if (!propose) {
    console.log(`  ⚠️ Propose #${proposeId} not found`);
    return undefined;
  }

  if (propose.songId) {
    // 이미 매칭됨
    return propose.songId;
  }

  // 2) 아티스트 songs 조회
  const songs = await fetchSongsForArtist(artistId);
  if (songs.length === 0) {
    return undefined;
  }

  // 3) 매칭 실행
  const proposeInfo: ProposeInfo = {
    id: propose.id,
    songTitle: propose.songTitle,
    songSinger: propose.songSinger,
  };

  const [mapping] = generateMapping(songs, [proposeInfo]);

  if (!mapping?.matchedSong) {
    return undefined;
  }

  // 4) DB 업데이트
  await prisma.songPropose.update({
    where: { id: proposeId },
    data: { songId: mapping.matchedSong.id },
  });

  console.log(
    `  ✅ [Propose #${proposeId}] "${propose.songTitle}" -> [Song #${mapping.matchedSong.id}] "${mapping.matchedSong.title}"`,
  );

  return mapping.matchedSong.id;
}

/**
 * 특정 아티스트의 미연결 신청곡(SongPropose)을 Song과 매칭합니다.
 *
 * @param artistId - 아티스트 ID
 * @param options.dryRun - true이면 실제 DB 업데이트 없이 결과만 반환
 */
export async function mapProposeSong(
  artistId: number,
  options: MapProposeSongOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  // 1) 아티스트 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      tjName: true,
      tjNameJa: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  const tjNames: string[] = [];
  if (artist.tjName) tjNames.push(artist.tjName);
  if (artist.tjNameJa) tjNames.push(artist.tjNameJa);

  console.log(`\n[Artist #${artist.id}] ${artist.name}`);
  console.log(`  TJ Names: ${tjNames.join(", ") || "(없음)"}`);
  if (dryRun) console.log(`  🔍 DRY-RUN MODE`);

  // 2) 아티스트 Song 조회
  const songs = await fetchSongsForArtist(artistId);
  console.log(`  Songs: ${songs.length}개`);

  // 3) 아티스트 미연결 신청곡 조회
  const proposes = await fetchProposesForArtist(tjNames);
  console.log(`  미연결 신청곡: ${proposes.length}개`);

  if (songs.length === 0 || proposes.length === 0) {
    console.log(
      `  ⏭️ No data (songs=${songs.length}, proposes=${proposes.length})`,
    );
    return;
  }

  // 4) 매칭 생성
  const mappings = generateMapping(songs, proposes);

  const withMatches = mappings.filter((m) => m.matchedSong !== null);
  const withCandidates = mappings.filter(
    (m) => m.matchedSong === null && m.candidates.length > 0,
  );
  const noMatches = mappings.filter(
    (m) => m.matchedSong === null && m.candidates.length === 0,
  );

  if (withMatches.length > 0) {
    console.log(`  ✅ Matched: ${withMatches.length}개`);
    for (const m of withMatches) {
      console.log(
        `     [Propose #${m.propose.id}] "${m.propose.songTitle}" -> [Song #${m.matchedSong!.id}] "${m.matchedSong!.title}"`,
      );
    }
  }
  if (withCandidates.length > 0) {
    console.log(`  🤔 Candidates only: ${withCandidates.length}개`);
  }
  if (noMatches.length > 0) {
    console.log(`  ❌ No match: ${noMatches.length}개`);
  }

  // 5) 적용
  const { updated, failed } = await applyMapping(mappings, dryRun);

  if (!dryRun && updated > 0) console.log(`  📝 Updated: ${updated}개`);
  if (failed > 0) console.log(`  ⚠️ Failed: ${failed}개`);

  console.log(
    `  • 완료: matched=${withMatches.length}, candidates=${withCandidates.length}, noMatch=${noMatches.length}`,
  );
}
