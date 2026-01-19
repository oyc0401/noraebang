import { prisma } from "../prisma";
import { findBestMatch } from "../song-spotify-matcher";
import { normalizeTitle } from "../track-title-normalizer";

// mapSongSpotifyTracks는 특정 아티스트의 스포티파이 트랙(songId 미지정)을 Song과 매칭하여 연결합니다.
// - songId가 null인 트랙들을 대상으로 매칭 수행
// - 트랙의 musicBrainzTitle(1순위) 또는 name(2순위)과 Song의 title/titleKo/titleLatin/titleJa 비교
// - 매칭된 Song의 id를 트랙의 songId에 설정

type ArtistData = {
  artistId: number;
  artistName: string;
  artistNameKo: string;
  spotifyArtistId: number | null;
  songs: Array<{
    id: number;
    title: string;
    titleKo: string | null;
    titleLatin: string | null;
    titleJa: string | null;
  }>;
  unmappedTracks: Array<{
    id: number;
    name: string;
    musicBrainzTitle: string | null;
  }>;
};

type Mapping = {
  trackId: number;
  trackName: string;
  songId: number;
  songTitle: string;
};

export interface MapSongSpotifyTracksOptions {
  dryRun?: boolean;
}

async function fetchArtistData(artistId: number): Promise<ArtistData | null> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
  });

  if (!artist) return null;

  const spotifyArtist = artist.spotifyId
    ? await prisma.spotifyArtist.findUnique({
        where: { spotifyId: artist.spotifyId },
        select: { id: true },
      })
    : null;

  const songs = await prisma.song.findMany({
    where: { artistSongs: { some: { artistId } } },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
    },
  });

  // songId가 null인 트랙들만 조회
  const unmappedTracks = spotifyArtist
    ? await prisma.spotifyTrack.findMany({
        where: {
          disabled: false,
          songId: null,
          artists: {
            some: { spotifyArtistId: spotifyArtist.id },
          },
        },
        select: {
          id: true,
          name: true,
          musicBrainzTitle: true,
        },
      })
    : [];

  return {
    artistId: artist.id,
    artistName: artist.name,
    artistNameKo: artist.nameKo,
    spotifyArtistId: spotifyArtist?.id ?? null,
    songs,
    unmappedTracks,
  };
}

function generateMappings(data: ArtistData): Mapping[] {
  const mappings: Mapping[] = [];

  // 원본 title → Song 맵 (findBestMatch 결과 조회용)
  const titleToSong = new Map<string, ArtistData["songs"][number]>();
  // 정규화된 title → Song 맵 (O(1) 완전 일치용)
  const normalizedToSong = new Map<string, ArtistData["songs"][number]>();

  for (const song of data.songs) {
    for (const title of [song.title, song.titleKo, song.titleLatin, song.titleJa]) {
      if (title?.trim()) {
        titleToSong.set(title, song);
        normalizedToSong.set(normalizeTitle(title), song);
      }
    }
  }
  const songTitleCandidates = [...titleToSong.keys()];

  // 각 트랙에 대해 매칭할 Song 찾기
  for (const track of data.unmappedTracks) {
    let matchedSong: ArtistData["songs"][number] | undefined;

    // 1순위: musicBrainzTitle로 매칭
    if (track.musicBrainzTitle?.trim()) {
      // O(1) 완전 일치 먼저 시도
      matchedSong = normalizedToSong.get(normalizeTitle(track.musicBrainzTitle));

      // 실패시 findBestMatch (유사도 비교)
      if (!matchedSong) {
        const result = findBestMatch(track.musicBrainzTitle, songTitleCandidates);
        if (result.answer) {
          matchedSong = titleToSong.get(result.answer);
        }
      }
    }

    // 2순위: name으로 매칭 (musicBrainzTitle 매칭 실패 시)
    if (!matchedSong) {
      // O(1) 완전 일치 먼저 시도
      matchedSong = normalizedToSong.get(normalizeTitle(track.name));

      // 실패시 findBestMatch (유사도 비교)
      if (!matchedSong) {
        const result = findBestMatch(track.name, songTitleCandidates);
        if (result.answer) {
          matchedSong = titleToSong.get(result.answer);
        }
      }
    }

    if (matchedSong) {
      mappings.push({
        trackId: track.id,
        trackName: track.musicBrainzTitle || track.name,
        songId: matchedSong.id,
        songTitle:
          matchedSong.titleJa ||
          matchedSong.titleLatin ||
          matchedSong.titleKo ||
          matchedSong.title,
      });
    }
  }

  return mappings;
}

async function applyMappings(
  mappings: Mapping[],
  options: { dryRun: boolean },
) {
  let applied = 0;
  let errors = 0;

  for (const mapping of mappings) {
    try {
      if (options.dryRun) {
        console.log(
          `[DRY-RUN] Track ${mapping.trackId} (${mapping.trackName}) → Song ${mapping.songId} (${mapping.songTitle})`,
        );
        applied += 1;
      } else {
        await prisma.spotifyTrack.update({
          where: { id: mapping.trackId },
          data: { songId: mapping.songId },
        });

        console.log(
          `✅ Track ${mapping.trackId} (${mapping.trackName}) → Song ${mapping.songId}`,
        );
        applied += 1;
      }
    } catch (error) {
      console.error(
        `❌ Track ${mapping.trackId} 매핑 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      errors += 1;
    }
  }

  return { applied, errors };
}

export async function mapSongSpotifyTracks(
  artistId: number,
  options: MapSongSpotifyTracksOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n🎵 mapSongSpotifyTracks → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const data = await fetchArtistData(artistId);
  if (!data) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  if (data.songs.length === 0 || data.unmappedTracks.length === 0) {
    console.log(
      `  ⏭️ No data (songs: ${data.songs.length}, unmappedTracks: ${data.unmappedTracks.length})`,
    );
    return;
  }

  console.log(`  • Artist: ${data.artistName} (${data.artistNameKo})`);
  console.log(
    `  • Songs: ${data.songs.length}, Unmapped Tracks: ${data.unmappedTracks.length}`,
  );

  const mappings = generateMappings(data);
  if (mappings.length === 0) {
    console.log(`  ⏭️ No mappings generated`);
    return;
  }

  console.log(`  • Mappings: ${mappings.length}`);

  const { applied, errors } = await applyMappings(mappings, {
    dryRun,
  });

  console.log(
    `  • 결과: applied=${applied}, errors=${errors}`,
  );
}
