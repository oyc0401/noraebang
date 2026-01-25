"use server";

import { prisma } from "@/lib/prisma";
import { autoFillArtistNames } from "@/lib/admin/auto-fill/auto-fill-artist-names";
import { autoFillSongTitles } from "@/lib/admin/auto-fill/auto-fill-song-titles";
import { fetchProposeForArtist } from "@/lib/admin/refresh/fetch-refresh-propose";
import { fetchSpotifyTracksForArtist } from "@/lib/admin/refresh/fetch-spotify-tracks";
import { fetchTopicVideosForArtist } from "@/lib/admin/refresh/fetch-youtube-videos";
import { fetchNewTjSongs } from "@/lib/admin/new-song-detection/fetch-new-tj-songs";
import { mapProposeSong } from "@/lib/admin/mapping/map-propose-song";
import { mapSongYoutubeVideo } from "@/lib/admin/mapping/map-song-youtube-video";
import { mapSongYoutubeVideoFromSearch } from "@/lib/admin/mapping/map-song-youtube-video-from-search";
import { mapSongSpotifyTracks } from "@/lib/admin/mapping/map-song-spotify-tracks";
import { updateSongThumbnails } from "@/lib/admin/auto-fill/update-song-thumbnails";
import { updateSongScore } from "@/lib/admin/auto-fill/update-song-score";
import { updateArtistThumbnails } from "@/lib/admin/auto-fill/update-artist-thumbnails";

export async function runAutoFillSongTitlesForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await autoFillSongTitles(artistId, { dryRun });
}

export async function runAutoFillArtistNamesForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await autoFillArtistNames(artistId, { dryRun });
}

export async function runMapProposeSongForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await mapProposeSong(artistId, { dryRun });
}

export async function runMapSongYoutubeVideoForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await mapSongYoutubeVideo(artistId, { dryRun });
}

export async function runMapSongYoutubeVideoFromSearchForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await mapSongYoutubeVideoFromSearch(artistId, { dryRun });
}

export async function runUpdateSongThumbnailsForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await updateSongThumbnails(artistId, { dryRun });
}

export async function runMapSongSpotifyGroupsForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await mapSongSpotifyTracks(artistId, { dryRun });
}

export async function runUpdateSongScoreForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await updateSongScore(artistId, { dryRun });
}

export async function runFetchProposeForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await fetchProposeForArtist(artistId, { dryRun });
}

export async function runFetchSpotifyTracksForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await fetchSpotifyTracksForArtist(artistId, { dryRun });
}

export async function runFetchTopicVideosForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await fetchTopicVideosForArtist(artistId, { dryRun });
}

export async function runFetchNewTjSongs(
  options: { dryRun?: boolean; yearMonth?: string } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await fetchNewTjSongs({ dryRun, yearMonth: options.yearMonth });
}

export async function runUpdateArtistThumbnailsForArtist(
  artistId: number,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const dryRun = Boolean(options.dryRun);
  await updateArtistThumbnails(artistId, { dryRun });
}

export async function getFilteredArtistIds(
  startId: number,
  endId: number,
  catalog: string | null,
): Promise<number[]> {
  const artists = await prisma.artist.findMany({
    where: {
      id: { gte: startId, lte: endId },
      ...(catalog ? { homeCatalog: catalog } : {}),
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return artists.map((a) => a.id);
}
