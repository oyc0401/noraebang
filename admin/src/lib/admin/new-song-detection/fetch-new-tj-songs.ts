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
 * 3. artistList로 Artist 찾기 (tjName 또는 name으로)
 * 4. 해당 Artist의 Song들 중 title 매칭되는 Song에 tjSongId 연결
 * 5. 매칭되는 Song이 없으면 새 Song 생성 (아티스트가 있는 경우에만)
 */

export interface FetchNewTjSongsOptions {
  dryRun?: boolean;
  yearMonth?: string; // YYYYMM 형식, 기본값은 현재 월
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
): Promise<{ id: number; name: string; slug: string | null } | undefined> {
  // 1. tjName으로 찾기
  let artist = await prisma.artist.findFirst({
    where: { tjName: artistName },
    select: { id: true, name: true, slug: true },
  });

  if (artist) return artist;

  // 2. name으로 찾기
  artist = await prisma.artist.findFirst({
    where: { name: artistName },
    select: { id: true, name: true, slug: true },
  });

  return artist ?? undefined;
}

// Artist의 Song들 조회 (SpotifyTrack 정보 포함)
async function fetchSongsForArtist(artistId: number): Promise<
  Array<{
    id: number;
    title: string;
    titleKo: string | null;
    titleLatin: string | null;
    titleJa: string | null;
    tjSongId: string | null;
    spotifyTitles: string[];
    musicBrainzTitles: string[];
  }>
> {
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
      spotifyTitles: [...new Set(spotifyTitles)], // 중복 제거
      musicBrainzTitles: [...new Set(musicBrainzTitles)],
    };
  });
}

// TjSong과 Song 매칭 (매칭 실패 시 null 반환, 성공 시 songId 반환)
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
  const unlinkedSongs = songs.filter((s) => !s.tjSongId);
  if (unlinkedSongs.length === 0) {
    return null;
  }

  // normalize된 title -> song 매핑
  const normalizedToSong = new Map<
    string,
    { song: (typeof songs)[0]; source: string }
  >();

  for (const song of unlinkedSongs) {
    // 기본 title 필드들
    const titleSources: Array<[string, string | null | undefined]> = [
      ["title", song.title],
      ["titleKo", song.titleKo],
      ["titleLatin", song.titleLatin],
      ["titleJa", song.titleJa],
    ];

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
        normalizedToSong.set(norm, { song, source: "spotifyTitle" });
      }
    }

    // MusicBrainz 타이틀들
    for (const mbTitle of song.musicBrainzTitles) {
      const norm = normalizeTitle(mbTitle);
      if (norm && !normalizedToSong.has(norm)) {
        normalizedToSong.set(norm, { song, source: "musicBrainzTitle" });
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
    return -1; // dry run에서는 임시 ID 반환
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

export async function fetchNewTjSongs(
  options: FetchNewTjSongsOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  // 현재 년월 계산
  const now = new Date();
  const yearMonth =
    options.yearMonth ??
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  console.log(`\n=== TJ 최신곡 수집 (${yearMonth}) ===`);
  if (dryRun) console.log(`  🔍 DRY-RUN MODE`);

  const stats = {
    fetched: 0,
    created: 0,
    skipped: 0,
    artistFound: 0,
    songLinked: 0,
    songCreated: 0,
    noArtist: 0,
    errors: 0,
  };

  // TjSong은 있지만 Song 연결이 없는 목록
  const unlinkedTjSongs: Array<{ id: string; title: string; artist: string }> =
    [];

  try {
    // 1. TJ API에서 곡 목록 가져오기
    const tjSongs = await fetchTjSongsByMonth(yearMonth);
    stats.fetched = tjSongs.length;

    if (tjSongs.length === 0) {
      console.log(`  → 곡이 없습니다.`);
      return;
    }

    if (dryRun) {
      // dry run: 미리보기만
      for (const song of tjSongs.slice(0, 5)) {
        console.log(`     - [${song.karaokeNo}] ${song.title} / ${song.artist}`);
      }
      if (tjSongs.length > 5) {
        console.log(`     ... 외 ${tjSongs.length - 5}개`);
      }
    }

    // 2. 각 곡 처리
    for (const tjSongData of tjSongs) {
      try {
        // 2-1. TjSong 저장
        const saveResult = await saveTjSong(tjSongData, dryRun);
        if (saveResult === "created") {
          stats.created++;
        } else {
          stats.skipped++;
          // 스킵된 TjSong 중 Song 연결이 없는 것 확인
          const linkedSong = await prisma.song.findUnique({
            where: { tjSongId: tjSongData.karaokeNo },
            select: { id: true },
          });
          if (!linkedSong) {
            unlinkedTjSongs.push({
              id: tjSongData.karaokeNo,
              title: tjSongData.title,
              artist: tjSongData.artist,
            });
          }
          continue; // 이미 있는 곡은 매칭 스킵
        }

        // 2-2. 아티스트 파싱
        const parsed = parseTJArtist(tjSongData.artist);
        // 메인 아티스트만 사용 (feature, producer는 제외)
        const mainArtists = parsed.artist;

        // 2-3. 메인 아티스트 중 첫 번째로 찾은 아티스트 사용
        let foundArtist: { id: number; name: string } | undefined;
        for (const artistName of mainArtists) {
          const artist = await findArtistByName(artistName);
          if (artist) {
            foundArtist = artist;
            break;
          }
        }

        if (!foundArtist) {
          stats.noArtist++;
          continue; // 아티스트가 없으면 스킵
        }

        stats.artistFound++;

        // 2-4. Song 매칭 시도
        const matchedSongId = await matchTjSongToSong(
          { id: tjSongData.karaokeNo, title: tjSongData.title },
          foundArtist.id,
        );

        if (matchedSongId) {
          // 매칭 성공: tjSongId 연결
          if (!dryRun) {
            await prisma.song.update({
              where: { id: matchedSongId },
              data: { tjSongId: tjSongData.karaokeNo },
            });
          }
          stats.songLinked++;
          console.log(
            `  ✅ [${tjSongData.karaokeNo}] "${tjSongData.title}" → Song #${matchedSongId} (Artist: ${foundArtist.name})`,
          );
        } else {
          // 매칭 실패: 새 Song 생성
          const newSongId = await createSongFromTjSong(
            { id: tjSongData.karaokeNo, title: tjSongData.title },
            foundArtist.id,
            dryRun,
          );
          stats.songCreated++;
          // slug가 있는 아티스트면 ⭐ 아이콘 (중요 아티스트)
          const icon = foundArtist.slug ? "⭐" : "🆕";
          console.log(
            `  ${icon} [${tjSongData.karaokeNo}] "${tjSongData.title}" → 새 Song #${newSongId} 생성 (Artist: ${foundArtist.name})`,
          );
        }
      } catch (error) {
        stats.errors++;
        console.log(`  ❌ [${tjSongData.karaokeNo}] 오류: ${error}`);
      }
    }

    console.log(`\n  === 결과 ===`);
    console.log(`  총 TjSong: ${stats.fetched}개`);
    console.log(`  TjSong 신규: ${stats.created}개`);
    console.log(`  TjSong 스킵 (기존): ${stats.skipped}개`);
    console.log(`  아티스트 찾음: ${stats.artistFound}건`);
    console.log(`  아티스트 없음: ${stats.noArtist}건`);
    console.log(`  Song 매칭 연결: ${stats.songLinked}건`);
    console.log(`  Song 신규 생성: ${stats.songCreated}건`);
    if (stats.errors > 0) {
      console.log(`  오류: ${stats.errors}건`);
    }

    // TjSong은 있지만 Song 연결이 없는 목록 출력
    if (unlinkedTjSongs.length > 0) {
      console.log(`\n  === Song 미연결 TjSong (${unlinkedTjSongs.length}개) ===`);
      for (const tj of unlinkedTjSongs) {
        console.log(`  ⚠️ [${tj.id}] "${tj.title}" / ${tj.artist}`);
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
