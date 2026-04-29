import { prisma } from "../../prisma";
import { parseTJArtist } from "../../artist-parser";
import { findBestMatch } from "../../song-spotify-matcher";
import { normalizeTitle } from "../../track-title-normalizer";

/**
 * 현재 월의 TJ 최신곡을 가져와서 DB에 저장하고,
 * 아티스트를 파싱하여 해당 아티스트의 Song과 매칭합니다.
 *
 * 1. TJ API에서 현재 월 최신곡 가져오기
 * 2. TjSong 테이블에 저장 (없는 것만)
 * 3. 기존 TjSong 중 Song과 연결되지 않은 곡도 옵션에 따라 처리 대상에 포함
 * 4. artistList로 Artist 찾기 (tjName 또는 name으로)
 * 5. 해당 Artist의 Song들 중 title 매칭되는 Song에 tjSongId 연결
 * 6. 매칭되는 Song이 없으면 새 Song 생성 (아티스트가 있는 경우에만)
 */

export interface FetchNewTjSongsOptions {
  dryRun?: boolean;
  yearMonth?: string; // YYYYMM 형식, 기본값은 현재 월

  /**
   * true면 이번 달 TJ API에서 가져온 곡뿐만 아니라,
   * DB에 이미 존재하지만 Song과 연결되지 않은 TjSong도 처리합니다.
   *
   * 예:
   * - 예전에 TjSong만 저장됨
   * - Song.tjSongId로 연결되지 않음
   * - 이후 스크립트를 다시 실행해서 Song 생성/매칭하고 싶음
   */
  includeExistingUnlinked?: boolean;
}

interface TJSongData {
  karaokeNo: string;
  title: string;
  artist: string;
  lyricist: string;
  composer: string;
  thumbnailImg?: string;
  publishdate: string;
}

interface ProcessableTjSong {
  id: string;
  title: string;
  artist: string;
  lyricist: string;
  composer: string;
  thumbnailImg?: string | null;
  publishdate: string;
}

interface ArtistLite {
  id: number;
  name: string;
  slug: string | null;
}

interface ArtistSongCandidate {
  id: number;
  title: string;
  titleKo: string | null;
  titleLatin: string | null;
  titleJa: string | null;
  tjSongId: string | null;
  spotifyTitles: string[];
  musicBrainzTitles: string[];
}

type ProcessResult =
  | "artist-not-found"
  | "song-linked"
  | "song-created"
  | "already-linked";

// TJ API에서 곡 목록 가져오기
async function fetchTjSongsByMonth(yearMonth: string): Promise<TJSongData[]> {
  console.log(`  → TJ API에서 ${yearMonth} 곡 목록 조회 중...`);

  const response = await fetch(
    "https://www.tjmedia.com/legacy/api/newSongOfMonth",
    {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ searchYm: yearMonth }),
    },
  );

  if (!response.ok) {
    throw new Error(`TJ API 호출 실패: ${response.status}`);
  }

  const data: any = await response.json();

  if (data.resultCode !== "99" || !data.resultData?.items) {
    console.log(`  ⚠️ TJ API 응답 오류:`, data);
    return [];
  }

  const songs: TJSongData[] = data.resultData.items.map((item: any) => ({
    karaokeNo: item.pro.toString(),
    title: item.indexTitle,
    artist: item.indexSong,
    lyricist: item.word,
    composer: item.com,
    thumbnailImg: item.thumbnailImg,
    publishdate: item.publishdate,
  }));

  console.log(`  → ${songs.length}개 곡 발견`);

  return songs;
}

// 작사/작곡가 간단 파싱 (콤마/슬래시로 분리)
function parseCreator(text: string): string[] {
  if (!text || text.trim() === "") return [];

  return text
    .split(/[,/&]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// TjSong 저장
async function saveTjSong(
  song: TJSongData,
  dryRun: boolean,
): Promise<"created" | "skipped"> {
  const existing = await prisma.tjSong.findUnique({
    where: { id: song.karaokeNo },
    select: { id: true },
  });

  if (existing) {
    return "skipped";
  }

  if (dryRun) {
    return "created";
  }

  const parsed = parseTJArtist(song.artist);
  const lyricistList = parseCreator(song.lyricist);
  const composerList = parseCreator(song.composer);

  await prisma.tjSong.create({
    data: {
      id: song.karaokeNo,
      title: song.title,
      artist: song.artist,
      artistList: parsed.artist,
      featureList: parsed.feature,
      producerList: parsed.producer,
      lyricist: song.lyricist,
      lyricistList,
      composer: song.composer,
      composerList,
      thumbnailImg: song.thumbnailImg,
      publishdate: song.publishdate,
    },
  });

  return "created";
}

// Artist 찾기 (tjName 또는 name으로)
async function findArtistByName(
  artistName: string,
): Promise<ArtistLite | undefined> {
  const normalizedArtistName = artistName.trim();

  if (!normalizedArtistName) {
    return undefined;
  }

  // 1. tjName으로 찾기
  let artist = await prisma.artist.findFirst({
    where: { tjName: normalizedArtistName },
    select: { id: true, name: true, slug: true },
  });

  if (artist) return artist;

  // 2. name으로 찾기
  artist = await prisma.artist.findFirst({
    where: { name: normalizedArtistName },
    select: { id: true, name: true, slug: true },
  });

  return artist ?? undefined;
}

// Artist의 Song들 조회 (SpotifyTrack 정보 포함)
async function fetchSongsForArtist(
  artistId: number,
): Promise<ArtistSongCandidate[]> {
  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: {
          artistId,
        },
      },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
      tjSongId: true,
      songSpotifyTracks: {
        select: {
          spotifyTrack: {
            select: {
              name: true,
              musicBrainzTitle: true,
            },
          },
        },
      },
    },
  });

  return songs.map((song) => {
    const spotifyTitles: string[] = [];
    const musicBrainzTitles: string[] = [];

    for (const sst of song.songSpotifyTracks) {
      if (sst.spotifyTrack.name) {
        spotifyTitles.push(sst.spotifyTrack.name);
      }

      if (sst.spotifyTrack.musicBrainzTitle) {
        musicBrainzTitles.push(sst.spotifyTrack.musicBrainzTitle);
      }
    }

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      titleJa: song.titleJa,
      tjSongId: song.tjSongId,
      spotifyTitles: [...new Set(spotifyTitles)],
      musicBrainzTitles: [...new Set(musicBrainzTitles)],
    };
  });
}

// TjSong과 Song 매칭
// 비교 대상: title, titleKo, titleLatin, titleJa, spotifyTitles, musicBrainzTitles
async function matchTjSongToSong(
  tjSong: { id: string; title: string },
  artistId: number,
): Promise<number | null> {
  const songs = await fetchSongsForArtist(artistId);

  if (songs.length === 0) {
    return null;
  }

  // 이미 tjSongId가 연결된 Song 제외
  const unlinkedSongs = songs.filter((song) => !song.tjSongId);

  if (unlinkedSongs.length === 0) {
    return null;
  }

  // normalize된 title -> song 매핑
  const normalizedToSong = new Map<
    string,
    { song: ArtistSongCandidate; source: string }
  >();

  for (const song of unlinkedSongs) {
    const titleSources: Array<[string, string | null | undefined]> = [
      ["title", song.title],
      ["titleKo", song.titleKo],
      ["titleLatin", song.titleLatin],
      ["titleJa", song.titleJa],
    ];

    // 기본 title 필드들
    for (const [source, raw] of titleSources) {
      if (!raw?.trim()) continue;

      const norm = normalizeTitle(raw);

      if (norm && !normalizedToSong.has(norm)) {
        normalizedToSong.set(norm, { song, source });
      }
    }

    // Spotify 트랙 이름들
    for (const spotifyTitle of song.spotifyTitles) {
      const norm = normalizeTitle(spotifyTitle);

      if (norm && !normalizedToSong.has(norm)) {
        normalizedToSong.set(norm, {
          song,
          source: "spotifyTitle",
        });
      }
    }

    // MusicBrainz 타이틀들
    for (const musicBrainzTitle of song.musicBrainzTitles) {
      const norm = normalizeTitle(musicBrainzTitle);

      if (norm && !normalizedToSong.has(norm)) {
        normalizedToSong.set(norm, {
          song,
          source: "musicBrainzTitle",
        });
      }
    }
  }

  const normalizedTitles = Array.from(normalizedToSong.keys());

  if (normalizedTitles.length === 0) {
    return null;
  }

  const normalizedTjTitle = normalizeTitle(tjSong.title);

  if (!normalizedTjTitle) {
    return null;
  }

  const result = findBestMatch(normalizedTjTitle, normalizedTitles);

  if (!result.answer) {
    return null;
  }

  const matched = normalizedToSong.get(result.answer);

  if (!matched) {
    return null;
  }

  return matched.song.id;
}

// 새 Song 생성 + ArtistSong 연결 + tjSongId 연결
async function createSongFromTjSong(
  tjSong: { id: string; title: string },
  artistId: number,
  dryRun: boolean,
): Promise<number> {
  if (dryRun) {
    return -1; // dry-run에서는 임시 ID 반환
  }

  const song = await prisma.song.create({
    data: {
      title: tjSong.title,
      tjSongId: tjSong.id,
      artistSongs: {
        create: {
          artistId,
          role: "MAIN",
        },
      },
    },
  });

  return song.id;
}

// Song과 연결되어 있는 TjSong인지 확인
async function findLinkedSongByTjSongId(
  tjSongId: string,
): Promise<{ id: number } | null> {
  return prisma.song.findUnique({
    where: {
      tjSongId,
    },
    select: {
      id: true,
    },
  });
}

// DB에 이미 존재하지만 Song과 연결되지 않은 TjSong 조회
// 네 스키마 기준 핵심:
// TjSong.song Song? 관계가 있으므로 song: null 로 바로 조회 가능
async function fetchExistingUnlinkedTjSongs(): Promise<ProcessableTjSong[]> {
  console.log(`  → 기존 TjSong 중 Song 미연결 항목 조회 중...`);

  const existingUnlinkedTjSongs = await prisma.tjSong.findMany({
    where: {
      song: null,
    },
    select: {
      id: true,
      title: true,
      artist: true,
      lyricist: true,
      composer: true,
      thumbnailImg: true,
      publishdate: true,
    },
    orderBy: [
      {
        publishdate: "desc",
      },
      {
        id: "desc",
      },
    ],
  });

  console.log(
    `  → 기존 Song 미연결 TjSong ${existingUnlinkedTjSongs.length}개 발견`,
  );

  return existingUnlinkedTjSongs.map((tjSong) => ({
    id: tjSong.id,
    title: tjSong.title,
    artist: tjSong.artist ?? "",
    lyricist: tjSong.lyricist ?? "",
    composer: tjSong.composer ?? "",
    thumbnailImg: tjSong.thumbnailImg,
    publishdate: tjSong.publishdate ?? "",
  }));
}

// API에서 가져온 TJSongData를 내부 처리용 형태로 변환
function toProcessableFromApiSong(song: TJSongData): ProcessableTjSong {
  return {
    id: song.karaokeNo,
    title: song.title,
    artist: song.artist,
    lyricist: song.lyricist,
    composer: song.composer,
    thumbnailImg: song.thumbnailImg,
    publishdate: song.publishdate,
  };
}

// 중복 TjSong 제거
function dedupeProcessableTjSongs(
  songs: ProcessableTjSong[],
): ProcessableTjSong[] {
  const map = new Map<string, ProcessableTjSong>();

  for (const song of songs) {
    if (!map.has(song.id)) {
      map.set(song.id, song);
    }
  }

  return Array.from(map.values());
}

// 하나의 TjSong에 대해 Artist 찾기 → Song 매칭 → 없으면 Song 생성
async function processTjSongToSong(
  tjSong: ProcessableTjSong,
  dryRun: boolean,
): Promise<ProcessResult> {
  const linkedSong = await findLinkedSongByTjSongId(tjSong.id);

  if (linkedSong) {
    return "already-linked";
  }

  if (!tjSong.artist.trim()) {
    console.log(
      `  ⚠️ [${tjSong.id}] "${tjSong.title}" → TjSong artist 비어 있음`,
    );
    return "artist-not-found";
  }

  const parsed = parseTJArtist(tjSong.artist);

  // 메인 아티스트만 사용하되,
  // DISH//처럼 아티스트명 자체에 구분자가 포함된 경우를 위해 원본 artist도 후보에 포함
  const mainArtists = [tjSong.artist.trim(), ...parsed.artist].filter(
    (name, index, arr) => {
      return name.length > 0 && arr.indexOf(name) === index;
    },
  );

  if (mainArtists.length === 0) {
    console.log(
      `  ⚠️ [${tjSong.id}] "${tjSong.title}" → 파싱된 메인 아티스트 없음 (${tjSong.artist})`,
    );
    return "artist-not-found";
  }

  console.log(
    `  🧪 [${tjSong.id}] "${tjSong.title}" artist 후보: ${mainArtists.join(", ")}`,
  );

  let foundArtist: ArtistLite | undefined;

  for (const artistName of mainArtists) {
    const artist = await findArtistByName(artistName);

    if (artist) {
      foundArtist = artist;
      break;
    }
  }

  if (!foundArtist) {
    console.log(
      `  ⚠️ [${tjSong.id}] "${tjSong.title}" → Artist 없음 (${tjSong.artist})`,
    );
    return "artist-not-found";
  }

  const matchedSongId = await matchTjSongToSong(
    {
      id: tjSong.id,
      title: tjSong.title,
    },
    foundArtist.id,
  );

  if (matchedSongId) {
    if (!dryRun) {
      await prisma.song.update({
        where: {
          id: matchedSongId,
        },
        data: {
          tjSongId: tjSong.id,
        },
      });
    }

    console.log(
      `  ✅ [${tjSong.id}] "${tjSong.title}" → Song #${matchedSongId} 연결 (Artist: ${foundArtist.name})`,
    );

    return "song-linked";
  }

  const newSongId = await createSongFromTjSong(
    {
      id: tjSong.id,
      title: tjSong.title,
    },
    foundArtist.id,
    dryRun,
  );

  const icon = foundArtist.slug ? "⭐" : "🆕";

  console.log(
    `  ${icon} [${tjSong.id}] "${tjSong.title}" → 새 Song #${newSongId} 생성 (Artist: ${foundArtist.name})`,
  );

  return "song-created";
}

export async function fetchNewTjSongs(
  options: FetchNewTjSongsOptions = {},
): Promise<void> {
  const { dryRun = false, includeExistingUnlinked = false } = options;

  // 현재 년월 계산
  const now = new Date();
  const yearMonth =
    options.yearMonth ??
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  console.log(`\n=== TJ 최신곡 수집 (${yearMonth}) ===`);

  if (dryRun) {
    console.log(`  🔍 DRY-RUN MODE`);
  }

  if (includeExistingUnlinked) {
    console.log(`  🔁 기존 Song 미연결 TjSong 포함 모드`);
  }

  const stats = {
    fetched: 0,
    created: 0,
    skipped: 0,
    existingUnlinkedIncluded: 0,
    alreadyLinked: 0,
    artistFound: 0,
    songLinked: 0,
    songCreated: 0,
    noArtist: 0,
    errors: 0,
  };

  const unlinkedTjSongs: Array<{
    id: string;
    title: string;
    artist: string;
  }> = [];

  try {
    // 1. TJ API에서 곡 목록 가져오기
    const tjSongs = await fetchTjSongsByMonth(yearMonth);
    stats.fetched = tjSongs.length;

    if (tjSongs.length === 0 && !includeExistingUnlinked) {
      console.log(`  → 곡이 없습니다.`);
      return;
    }

    if (dryRun && tjSongs.length > 0) {
      console.log(`\n  === API 조회 미리보기 ===`);

      for (const song of tjSongs.slice(0, 5)) {
        console.log(
          `     - [${song.karaokeNo}] ${song.title} / ${song.artist}`,
        );
      }

      if (tjSongs.length > 5) {
        console.log(`     ... 외 ${tjSongs.length - 5}개`);
      }
    }

    const processableSongs: ProcessableTjSong[] = [];

    // 2. API에서 가져온 곡 저장/확인
    for (const tjSongData of tjSongs) {
      try {
        const saveResult = await saveTjSong(tjSongData, dryRun);

        if (saveResult === "created") {
          stats.created++;

          processableSongs.push(toProcessableFromApiSong(tjSongData));

          continue;
        }

        stats.skipped++;

        // 기존 TjSong인 경우:
        // 이미 Song과 연결되어 있으면 처리할 필요 없음
        const linkedSong = await findLinkedSongByTjSongId(tjSongData.karaokeNo);

        if (linkedSong) {
          stats.alreadyLinked++;

          continue;
        }

        // 기존 TjSong이지만 Song 연결이 없는 경우:
        // Song 매칭/생성 처리 대상에 포함
        unlinkedTjSongs.push({
          id: tjSongData.karaokeNo,
          title: tjSongData.title,
          artist: tjSongData.artist,
        });

        processableSongs.push(toProcessableFromApiSong(tjSongData));

        console.log(
          `  🔁 [${tjSongData.karaokeNo}] "${tjSongData.title}" 기존 TjSong이지만 Song 미연결 → 매칭/생성 대상 포함`,
        );
      } catch (error) {
        stats.errors++;
        console.log(
          `  ❌ [${tjSongData.karaokeNo}] TjSong 저장/확인 오류: ${error}`,
        );
      }
    }

    // 3. 옵션이 켜져 있으면 DB에 이미 존재하는 모든 미연결 TjSong도 처리 대상에 포함
    if (includeExistingUnlinked) {
      const existingUnlinkedTjSongs = await fetchExistingUnlinkedTjSongs();

      stats.existingUnlinkedIncluded = existingUnlinkedTjSongs.length;

      for (const tjSong of existingUnlinkedTjSongs) {
        unlinkedTjSongs.push({
          id: tjSong.id,
          title: tjSong.title,
          artist: tjSong.artist,
        });

        processableSongs.push(tjSong);
      }
    }

    const dedupedProcessableSongs = dedupeProcessableTjSongs(processableSongs);

    if (dedupedProcessableSongs.length === 0) {
      console.log(`\n  → Song 매칭/생성 대상이 없습니다.`);
    }

    // 4. Song 매칭/생성 처리
    for (const tjSong of dedupedProcessableSongs) {
      try {
        const result = await processTjSongToSong(tjSong, dryRun);

        switch (result) {
          case "artist-not-found": {
            stats.noArtist++;
            break;
          }

          case "song-linked": {
            stats.artistFound++;
            stats.songLinked++;
            break;
          }

          case "song-created": {
            stats.artistFound++;
            stats.songCreated++;
            break;
          }

          case "already-linked": {
            stats.alreadyLinked++;
            break;
          }
        }
      } catch (error) {
        stats.errors++;
        console.log(
          `  ❌ [${tjSong.id}] "${tjSong.title}" Song 처리 오류: ${error}`,
        );
      }
    }

    console.log(`\n  === 결과 ===`);
    console.log(`  API 조회 TjSong: ${stats.fetched}개`);
    console.log(`  TjSong 신규: ${stats.created}개`);
    console.log(`  TjSong 스킵 (기존): ${stats.skipped}개`);
    console.log(`  기존 Song 미연결 포함: ${stats.existingUnlinkedIncluded}개`);
    console.log(`  이미 Song 연결됨: ${stats.alreadyLinked}건`);
    console.log(`  아티스트 찾음: ${stats.artistFound}건`);
    console.log(`  아티스트 없음: ${stats.noArtist}건`);
    console.log(`  Song 매칭 연결: ${stats.songLinked}건`);
    console.log(`  Song 신규 생성: ${stats.songCreated}건`);

    if (stats.errors > 0) {
      console.log(`  오류: ${stats.errors}건`);
    }

    // 처리 대상에 포함된 Song 미연결 TjSong 목록 출력
    const dedupedUnlinked = dedupeProcessableTjSongs(
      unlinkedTjSongs.map((tjSong) => ({
        id: tjSong.id,
        title: tjSong.title,
        artist: tjSong.artist,
        lyricist: "",
        composer: "",
        thumbnailImg: null,
        publishdate: "",
      })),
    );

    if (dedupedUnlinked.length > 0) {
      console.log(
        `\n  === 처리 대상에 포함된 Song 미연결 TjSong (${dedupedUnlinked.length}개) ===`,
      );

      for (const tjSong of dedupedUnlinked) {
        console.log(`  ⚠️ [${tjSong.id}] "${tjSong.title}" / ${tjSong.artist}`);
      }
    }

    if (dryRun) {
      console.log(`\n  • DRY-RUN: 작업 미적용`);
    }
  } catch (error) {
    console.log(`  ❌ 오류: ${error}`);
    throw error;
  }
}
