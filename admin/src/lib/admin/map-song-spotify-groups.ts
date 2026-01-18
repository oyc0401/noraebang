import { prisma } from "../prisma";
import { findBestMatch } from "../song-spotify-matcher";

// mapSongSpotifyGroups는 아티스트 범위를 순회하면서 Song과 SpotifyTrackGroup을 자동 매핑합니다.

type ArtistSongsData = {
  artistId: number;
  artistName: string;
  artistNameKo: string;
  spotifyArtistId: number | null;
  songs: Array<{
    id: number;
    title: string;
    titleKo: string | null;
  }>;
  spotifyTracks: Array<{
    id: number;
    title: string;
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
  minArtistId: number;
  maxArtistId: number;
  dryRun?: boolean;
  force?: boolean;
  logger?: (line: string) => void;
}

export interface MapSongSpotifyGroupsResult {
  minArtistId: number;
  maxArtistId: number;
  dryRun: boolean;
  force: boolean;
  processedArtists: number;
  stats: {
    mappedSongs: number;
    artistSkippedNoData: number;
    songSkippedAlreadyLinked: number;
    errors: number;
  };
}

const noop = () => {};

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
      .filter((title): title is string => Boolean(title && title.trim()));
    const candidateTitles = data.spotifyTracks.map((track) => track.title);

    const sources = [
      song.title,
      song.titleKo,
      song.titleLatin,
      song.titleJa,
    ].filter(Boolean) as string[];

    let finalAnswer: string | null = null;
    let answerField: "musicBrainzTitle" | "title" | null = null;

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
        answerField = "title";
        break;
      }
    }

    if (finalAnswer && answerField) {
      const matchedTrack = data.spotifyTracks.find((track) =>
        answerField === "musicBrainzTitle"
          ? track.musicBrainzTitle === finalAnswer
          : track.title === finalAnswer,
      );

      if (matchedTrack) {
        mappings.push({
          spotifyTrackId: matchedTrack.id,
          spotifyTrackName: matchedTrack.musicBrainzTitle || matchedTrack.title,
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
  options: { dryRun: boolean; force: boolean; log: (line: string) => void },
) {
  let applied = 0;
  let errors = 0;
  let skipped = 0;

  for (const mapping of mappings) {
    try {
      if (!options.force) {
        const existing = await prisma.song.findUnique({
          where: { id: mapping.songId },
          select: { spotifyTrackGroupId: true },
        });
        if (existing?.spotifyTrackGroupId) {
          skipped += 1;
          continue;
        }
      }

      const spotifyTrack = await prisma.spotifyTrack.findUnique({
        where: { id: mapping.spotifyTrackId },
        select: { groupId: true },
      });

      if (!spotifyTrack || !spotifyTrack.groupId) {
        options.log(`❌ SpotifyTrack ${mapping.spotifyTrackId} 그룹 정보 없음`);
        errors += 1;
        continue;
      }

      if (options.dryRun) {
        options.log(
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
      options.log(
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
  options: MapSongSpotifyGroupsOptions,
): Promise<MapSongSpotifyGroupsResult> {
  const {
    minArtistId,
    maxArtistId,
    dryRun = false,
    force = false,
    logger,
  } = options;
  const log = logger ?? (dryRun ? console.log : noop);

  let processedArtists = 0;
  let artistSkippedNoData = 0;
  let mappedSongs = 0;
  let songSkippedAlreadyLinked = 0;
  let errors = 0;

  for (let artistId = minArtistId; artistId <= maxArtistId; artistId++) {
    const data = await fetchArtistData(artistId);
    if (!data) continue;

    if (data.songs.length === 0 || data.spotifyTracks.length === 0) {
      artistSkippedNoData += 1;
      continue;
    }

    const mappings = generateMappings(data);
    if (mappings.length === 0) {
      artistSkippedNoData += 1;
      continue;
    }

    const {
      applied,
      errors: applyErrors,
      skipped,
    } = await applyMappings(mappings, { dryRun, force, log });

    mappedSongs += applied;
    songSkippedAlreadyLinked += skipped;
    errors += applyErrors;
    processedArtists += 1;
  }

  return {
    minArtistId,
    maxArtistId,
    dryRun,
    force,
    processedArtists,
    stats: {
      mappedSongs,
      artistSkippedNoData,
      songSkippedAlreadyLinked,
      errors,
    },
  };
}
