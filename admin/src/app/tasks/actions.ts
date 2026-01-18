"use server";

import {
  autoFillArtistNames,
  type AutoFillArtistNamesResult,
} from "@/lib/admin/auto-fill-artist-names";
import {
  autoFillSongTitles,
  type AutoFillSongTitlesResult,
} from "@/lib/admin/auto-fill-song-titles";
import { mapProposeSong } from "@/lib/admin/map-propose-song";
import {
  mapSongYoutubeVideo,
  type MapSongYoutubeVideoResult,
} from "@/lib/admin/map-song-youtube-video";
import {
  mapSongSpotifyGroups,
  type MapSongSpotifyGroupsResult,
} from "@/lib/admin/map-song-spotify-groups";
import {
  updateSongThumbnails,
  type UpdateSongThumbnailsResult,
} from "@/lib/admin/update-song-thumbnails";
import { MAX_ARTIST } from "@/lib/admin/z-param";
import { prisma } from "@/lib/prisma";

type RunMapProposeSongInput = {
  startId?: number | null;
  endId?: number | null;
  dryRun?: boolean | null;
};

export type MapProposeSongJobLog = {
  artistId: number;
  artistName: string;
  status: "success" | "error";
  songCount?: number;
  proposeCount?: number;
  stats?: {
    matched: number;
    withCandidates: number;
    noMatch: number;
    updated: number;
    failed: number;
  };
  message: string;
  error?: string;
};

export type MapProposeSongJobResult = {
  totalArtists: number;
  successCount: number;
  failedCount: number;
  dryRun: boolean;
  logs: MapProposeSongJobLog[];
};

export type MapSongYoutubeVideoJobLog = {
  artistId: number;
  artistName: string;
  status: "success" | "error";
  result?: MapSongYoutubeVideoResult;
  message: string;
  error?: string;
};

export type MapSongYoutubeVideoJobResult = {
  totalArtists: number;
  successCount: number;
  failedCount: number;
  dryRun: boolean;
  logs: MapSongYoutubeVideoJobLog[];
};

const DEFAULT_START_ID = 1;

type RangeInput = {
  startId?: number | null;
  endId?: number | null;
  dryRun?: boolean | null;
};

const parsePositiveInt = (value?: number | null, fallback?: number) => {
  if (typeof value !== "number") return fallback;
  if (!Number.isFinite(value)) return fallback;
  const intValue = Math.floor(value);
  if (intValue <= 0) return fallback;
  return intValue;
};

export async function runMapProposeSongJob(
  input: RunMapProposeSongInput,
): Promise<MapProposeSongJobResult> {
  const dryRun = Boolean(input.dryRun);
  const startId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const endId = parsePositiveInt(input.endId, MAX_ARTIST)!;

  if (startId > endId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }

  const artists = await prisma.artist.findMany({
    where: {
      id: { gte: startId, lte: endId },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { id: "asc" },
  });

  const logs: MapProposeSongJobLog[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const artist of artists) {
    try {
      const result = await mapProposeSong(artist.id, {
        dryRun,
        verbose: false,
      });
      const message = `matched ${result.stats.matched}, candidates ${result.stats.withCandidates}, noMatch ${result.stats.noMatch}, updated ${result.stats.updated}`;
      logs.push({
        artistId: artist.id,
        artistName: artist.name,
        status: "success",
        songCount: result.songCount,
        proposeCount: result.proposeCount,
        stats: result.stats,
        message: dryRun ? `${message} (dry-run)` : message,
      });
      successCount += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      logs.push({
        artistId: artist.id,
        artistName: artist.name,
        status: "error",
        message,
        error: message,
      });
      failedCount += 1;
    }
  }

  return {
    totalArtists: artists.length,
    successCount,
    failedCount,
    dryRun,
    logs,
  };
}

export async function runAutoFillSongTitlesJob(
  input: RangeInput,
): Promise<AutoFillSongTitlesResult> {
  const dryRun = Boolean(input.dryRun);
  const minArtistId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const maxArtistId = parsePositiveInt(input.endId, MAX_ARTIST)!;
  if (minArtistId > maxArtistId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }
  return autoFillSongTitles(
    { minArtistId, maxArtistId },
    {
      dryRun,
      verbose: true,
    },
  );
}

export async function runAutoFillArtistNamesJob(
  input: RangeInput,
): Promise<AutoFillArtistNamesResult> {
  const dryRun = Boolean(input.dryRun);
  const minArtistId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const maxArtistId = parsePositiveInt(input.endId, MAX_ARTIST)!;
  if (minArtistId > maxArtistId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }
  return autoFillArtistNames(
    { minArtistId, maxArtistId },
    {
      dryRun,
      verbose: true,
    },
  );
}

export async function runMapProposeSongForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
) {
  const dryRun = Boolean(options.dryRun);
  return mapProposeSong(artistId, {
    dryRun,
    verbose: false,
  });
}

export async function runMapSongYoutubeVideoForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<MapSongYoutubeVideoResult> {
  const dryRun = Boolean(options.dryRun);
  return mapSongYoutubeVideo(artistId, {
    dryRun,
    verbose: true,
  });
}

export async function runMapSongYoutubeVideoJob(
  input: RunMapProposeSongInput,
): Promise<MapSongYoutubeVideoJobResult> {
  const dryRun = Boolean(input.dryRun);
  const startId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const endId = parsePositiveInt(input.endId, MAX_ARTIST)!;

  if (startId > endId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }

  const artists = await prisma.artist.findMany({
    where: {
      id: { gte: startId, lte: endId },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { id: "asc" },
  });

  const logs: MapSongYoutubeVideoJobLog[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const artist of artists) {
    try {
      const result = await mapSongYoutubeVideo(artist.id, {
        dryRun,
        verbose: false,
      });
      logs.push({
        artistId: artist.id,
        artistName: artist.name,
        status: "success",
        result,
        message: `matched ${result.stats.songsWithMatches} songs, inserted ${result.stats.inserted}`,
      });
      successCount += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      logs.push({
        artistId: artist.id,
        artistName: artist.name,
        status: "error",
        message,
        error: message,
      });
      failedCount += 1;
    }
  }

  return {
    totalArtists: artists.length,
    successCount,
    failedCount,
    dryRun,
    logs,
  };
}

export async function runUpdateSongThumbnailsJob(
  input: RunMapProposeSongInput,
): Promise<UpdateSongThumbnailsResult> {
  const dryRun = Boolean(input.dryRun);
  const startId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const endId = parsePositiveInt(input.endId, MAX_ARTIST)!;

  if (startId > endId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }

  return updateSongThumbnails(
    { minArtistId: startId, maxArtistId: endId },
    { dryRun, verbose: true },
  );
}

export async function runMapSongSpotifyGroupsJob(
  input: RunMapProposeSongInput,
): Promise<MapSongSpotifyGroupsResult> {
  const dryRun = Boolean(input.dryRun);
  const startId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const endId = parsePositiveInt(input.endId, MAX_ARTIST)!;

  if (startId > endId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }

  return mapSongSpotifyGroups({
    minArtistId: startId,
    maxArtistId: endId,
    dryRun,
  });
}
