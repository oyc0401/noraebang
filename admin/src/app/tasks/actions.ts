"use server";

import { autoFillArtistNames } from "@/lib/admin/auto-fill-artist-names";
import { autoFillSongTitles } from "@/lib/admin/auto-fill-song-titles";
import { mapProposeSong } from "@/lib/admin/map-propose-song";
import { mapSongYoutubeVideo } from "@/lib/admin/map-song-youtube-video";
import { mapSongSpotifyTracks } from "@/lib/admin/map-song-spotify-tracks";
import { updateSongThumbnails } from "@/lib/admin/update-song-thumbnails";

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
