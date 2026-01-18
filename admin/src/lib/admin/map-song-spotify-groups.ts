import { prisma } from "../prisma";
import { findBestMatch } from "../song-spotify-matcher";

// mapSongSpotifyGroups는 단일 아티스트의 Song과 SpotifyTrackGroup을 자동 매핑합니다.

type ArtistSongsData = {
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
  spotifyTracks: Array<{
    id: number;
    name: string;
    musicBrainzTitle?: string | null;
    groupId?: number | null;
  }>;
};

type Mapping = {
  spotifyTrackId: number;
  spotifyTrackName: string;
  songId: number;
  songName: string;
};

export interface MapSongSpotifyGroupsOptions {
  dryRun?: boolean;
}

async function fetchArtistData(
  artistId: number,
): Promise<ArtistSongsData | null> {
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
      spotifyTrackGroupId: true,
    },
  });

  const spotifyTracks = spotifyArtist
    ? await prisma.spotifyTrack.findMany({
        where: {
          disabled: false,
          groupId: { not: null },
          artists: {
            some: { spotifyArtistId: spotifyArtist.id },
          },
        },
        select: {
          id: true,
          name: true,
          musicBrainzTitle: true,
          groupId: true,
        },
      })
    : [];

  return {
    artistId: artist.id,
    artistName: artist.name,
    artistNameKo: artist.nameKo ?? "",
    spotifyArtistId: spotifyArtist?.id ?? null,
    songs: songs.map((song) => ({
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      titleJa: song.titleJa,
    })),
    spotifyTracks,
  };
}

function generateMappings(data: ArtistSongsData): Mapping[] {
  const mappings: Mapping[] = [];

  for (const song of data.songs) {
    const candidateMbTitles = data.spotifyTracks
      .map((track) => track.musicBrainzTitle)
      .filter((title): title is string => Boolean(title?.trim()));
    const candidateTitles = data.spotifyTracks.map((track) => track.name);

    const sources = [
      song.title,
      song.titleKo,
      song.titleLatin,
      song.titleJa,
    ].filter(Boolean) as string[];

    let finalAnswer: string | null = null;
    let answerField: "musicBrainzTitle" | "name" | null = null;

    for (const source of sources) {
      if (candidateMbTitles.length > 0) {
        const result = findBestMatch(source, candidateMbTitles);
        if (result.answer) {
          finalAnswer = result.answer;
          answerField = "musicBrainzTitle";
          break;
        }
      }

      const result = findBestMatch(source, candidateTitles);
      if (result.answer) {
        finalAnswer = result.answer;
        answerField = "name";
        break;
      }
    }

    if (finalAnswer && answerField) {
      const matchedTrack = data.spotifyTracks.find((track) =>
        answerField === "musicBrainzTitle"
          ? track.musicBrainzTitle === finalAnswer
          : track.name === finalAnswer,
      );

      if (matchedTrack) {
        mappings.push({
          spotifyTrackId: matchedTrack.id,
          spotifyTrackName: matchedTrack.musicBrainzTitle || matchedTrack.name,
          songId: song.id,
          songName:
            song.titleJa || song.titleLatin || song.titleKo || song.title,
        });
      }
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
  let skipped = 0;

  for (const mapping of mappings) {
    try {
      const existing = await prisma.song.findUnique({
        where: { id: mapping.songId },
        select: { spotifyTrackGroupId: true },
      });
      if (existing?.spotifyTrackGroupId) {
        skipped += 1;
        continue;
      }

      const spotifyTrack = await prisma.spotifyTrack.findUnique({
        where: { id: mapping.spotifyTrackId },
        select: { groupId: true },
      });

      if (!spotifyTrack || !spotifyTrack.groupId) {
        console.warn(`❌ SpotifyTrack ${mapping.spotifyTrackId} 그룹 정보 없음`);
        errors += 1;
        continue;
      }

      if (options.dryRun) {
        console.log(
          `[DRY-RUN] Song ${mapping.songId} ↔ Group ${spotifyTrack.groupId}`,
        );
        applied += 1;
      } else {
        await prisma.song.update({
          where: { id: mapping.songId },
          data: { spotifyTrackGroupId: spotifyTrack.groupId },
        });
        applied += 1;
      }
    } catch (error) {
      console.error(
        `❌ Song ${mapping.songId} 매핑 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      errors += 1;
    }
  }

  return { applied, errors, skipped };
}

export async function mapSongSpotifyGroups(
  artistId: number,
  options: MapSongSpotifyGroupsOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n🎵 mapSongSpotifyGroups → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const data = await fetchArtistData(artistId);
  if (!data) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  if (data.songs.length === 0 || data.spotifyTracks.length === 0) {
    console.log(
      `  ⏭️ No data (songs: ${data.songs.length}, tracks: ${data.spotifyTracks.length})`,
    );
    return;
  }

  console.log(
    `  • Artist: ${data.artistName} (${data.artistNameKo})`,
  );
  console.log(
    `  • Songs: ${data.songs.length}, Tracks: ${data.spotifyTracks.length}`,
  );

  const mappings = generateMappings(data);
  if (mappings.length === 0) {
    console.log(`  ⏭️ No mappings generated`);
    return;
  }

  console.log(`  • Mappings: ${mappings.length}`);

  const { applied, errors, skipped } = await applyMappings(mappings, { dryRun });

  console.log(
    `  • 결과: applied=${applied}, skipped=${skipped}, errors=${errors}`,
  );
}
