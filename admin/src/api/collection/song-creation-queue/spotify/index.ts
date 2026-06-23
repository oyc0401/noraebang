import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { normalizeTitle } from "../../../../lib/normalizer";
import { findBestMatch } from "../../../../lib/text-matcher";

export type SpotifyTrackMatch = {
  id: string;
  name: string;
  isrc: string | null;
  durationMs: number | null;
  releaseDate: string | null;
  albumImages: string[];
  isBestMatch: boolean;
};

type SpotifyTrackRow = {
  id: string;
  name: string | null;
  isrc: string | null;
  duration_ms: number | null;
  release_date: string | null;
  album_images: string[] | null;
};

// tjTitle과 artistId로 아티스트의 스포티파이 트랙들을 찾고, 그 중 제목이 일치하는 트랙들을 모두 찾는다.
export async function searchSpotifyTrack(
  tjTitle: string,
  artistId: number,
): Promise<SpotifyTrackMatch[]> {
  const title = normalizeNullable(tjTitle);

  if (!title) {
    return [];
  }

  const spotifyArtistId = await getArtistSpotifyId(artistId);

  if (!spotifyArtistId) {
    return [];
  }

  const tracks = await findSpotifyTracksByArtist(spotifyArtistId);

  return matchTracksToTitle(title, tracks);
}

async function getArtistSpotifyId(artistId: number): Promise<string | null> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
  });

  try {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: { spotifyId: true },
    });

    return normalizeNullable(artist?.spotifyId);
  } finally {
    await prisma.$disconnect();
  }
}

async function findSpotifyTracksByArtist(
  spotifyArtistId: string,
): Promise<SpotifyTrackRow[]> {
  const client = new Client({
    connectionString: getMediaDatabaseUrl(),
  });

  await client.connect();

  try {
    const result = await client.query<SpotifyTrackRow>(
      `
        select
          t.id,
          t.name,
          t.isrc,
          t.duration_ms,
          t.release_date,
          t.album_images
        from spotify_artist_track at
        join spotify_track t on t.id = at.spotify_track_id
        where at.spotify_artist_id = $1
        order by t.release_date desc nulls last
      `,
      [spotifyArtistId],
    );

    return result.rows;
  } finally {
    await client.end();
  }
}

function matchTracksToTitle(
  songTitle: string,
  tracks: SpotifyTrackRow[],
): SpotifyTrackMatch[] {
  const tracksByNormalizedName = new Map<string, SpotifyTrackRow[]>();

  for (const track of tracks) {
    const rawName = normalizeNullable(track.name);
    if (!rawName) continue;

    const normalizedName = normalizeTitle(rawName);
    const bucket = tracksByNormalizedName.get(normalizedName) ?? [];
    bucket.push(track);
    tracksByNormalizedName.set(normalizedName, bucket);
  }

  const normalizedSongTitle = normalizeTitle(songTitle);
  const matches: SpotifyTrackMatch[] = [];

  // distinct 트랙명마다 1:1로 비교 → findBestMatch의 후보 5개 캡에 안 걸리고 전부 모음
  for (const [normalizedName, bucket] of tracksByNormalizedName) {
    const { answer, candidate } = findBestMatch(normalizedSongTitle, [
      normalizedName,
    ]);

    if (!answer && candidate.length === 0) continue;

    for (const track of bucket) {
      matches.push(toMatch(track, answer !== null));
    }
  }

  return matches;
}

function toMatch(
  row: SpotifyTrackRow,
  isBestMatch: boolean,
): SpotifyTrackMatch {
  return {
    id: row.id,
    name: normalizeNullable(row.name) ?? "",
    isrc: row.isrc,
    durationMs: row.duration_ms,
    releaseDate: row.release_date,
    albumImages: row.album_images ?? [],
    isBestMatch,
  };
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || null;
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

function getMediaDatabaseUrl(): string {
  const databaseUrl = process.env.MEDIA_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("MEDIA_DATABASE_URL is required");
  }

  return databaseUrl;
}
