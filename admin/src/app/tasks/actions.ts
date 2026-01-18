"use server";

import { autoFillArtistNames } from "@/lib/admin/auto-fill-artist-names";
import { autoFillSongTitles } from "@/lib/admin/auto-fill-song-titles";
import { mapProposeSong } from "@/lib/admin/map-propose-song";
import { mapSongYoutubeVideo } from "@/lib/admin/map-song-youtube-video";
import { mapSongSpotifyGroups } from "@/lib/admin/map-song-spotify-groups";
import { updateSongThumbnails } from "@/lib/admin/update-song-thumbnails";
import { MAX_ARTIST } from "@/lib/admin/z-param";
import { prisma } from "@/lib/prisma";

type RunMapProposeSongInput = {
  startId?: number | null;
  endId?: number | null;
  dryRun?: boolean | null;
};

export type MapProposeSongJobResult = {
  totalArtists: number;
  successCount: number;
  failedCount: number;
  dryRun: boolean;
};

export type MapSongYoutubeVideoJobResult = {
  totalArtists: number;
  successCount: number;
  failedCount: number;
  dryRun: boolean;
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

  let successCount = 0;
  let failedCount = 0;

  for (const artist of artists) {
    try {
      await mapProposeSong(artist.id, {
        dryRun,
      });
      successCount += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      console.error(`[mapProposeSong] Artist #${artist.id} 실패: ${message}`);
      failedCount += 1;
    }
  }

  return {
    totalArtists: artists.length,
    successCount,
    failedCount,
    dryRun,
  };
}

export async function runAutoFillSongTitlesJob(
  input: RangeInput,
): Promise<void> {
  const dryRun = Boolean(input.dryRun);
  const minArtistId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const maxArtistId = parsePositiveInt(input.endId, MAX_ARTIST)!;
  if (minArtistId > maxArtistId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }
  await autoFillSongTitles({ minArtistId, maxArtistId }, { dryRun });
}

export async function runAutoFillArtistNamesJob(
  input: RangeInput,
): Promise<void> {
  const dryRun = Boolean(input.dryRun);
  const minArtistId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const maxArtistId = parsePositiveInt(input.endId, MAX_ARTIST)!;
  if (minArtistId > maxArtistId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }
  await autoFillArtistNames({ minArtistId, maxArtistId }, { dryRun });
}

export async function runMapProposeSongForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
) {
  const dryRun = Boolean(options.dryRun);
  await mapProposeSong(artistId, {
    dryRun,
  });
}

export async function runMapSongYoutubeVideoForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await mapSongYoutubeVideo(artistId, {
    dryRun,
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

  let successCount = 0;
  let failedCount = 0;

  for (const artist of artists) {
    try {
      await mapSongYoutubeVideo(artist.id, {
        dryRun,
      });

      successCount += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      console.error(
        `[mapSongYoutubeVideoJob] Artist #${artist.id} 실패: ${message}`,
      );
      failedCount += 1;
    }
  }

  return {
    totalArtists: artists.length,
    successCount,
    failedCount,
    dryRun,
  };
}

export async function runUpdateSongThumbnailsJob(
  input: RunMapProposeSongInput,
): Promise<void> {
  const dryRun = Boolean(input.dryRun);
  const startId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const endId = parsePositiveInt(input.endId, MAX_ARTIST)!;

  if (startId > endId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }

  await updateSongThumbnails({ minArtistId: startId, maxArtistId: endId }, { dryRun });
}

export async function runMapSongSpotifyGroupsJob(
  input: RunMapProposeSongInput,
): Promise<void> {
  const dryRun = Boolean(input.dryRun);
  const startId = parsePositiveInt(input.startId, DEFAULT_START_ID)!;
  const endId = parsePositiveInt(input.endId, MAX_ARTIST)!;

  if (startId > endId) {
    throw new Error("시작 ID가 종료 ID보다 클 수 없습니다.");
  }

  await mapSongSpotifyGroups({
    minArtistId: startId,
    maxArtistId: endId,
    dryRun,
  });
}
