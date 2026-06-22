/**
 * Import YouTube / Spotify media rows from legacy song_db into the media DB.
 *
 * Usage:
 *   cd media
 *   pnpm tsx src/scripts/import-legacy-media.ts
 *   pnpm tsx src/scripts/import-legacy-media.ts --apply
 *
 * Reads LEGACY_DATABASE_URL and MEDIA_DATABASE_URL. The legacy DB is read-only.
 */
import "dotenv/config";
import { Client } from "pg";

const APPLY = process.argv.includes("--apply");
const BATCH_SIZE = 1000;

type LegacyYoutubeChannel = {
  id: number;
  channel_id: string;
  title: string | null;
  description: string | null;
  custom_url: string | null;
  published_at: Date | null;
  country: string | null;
  default_language: string | null;
  thumbnail_default: string | null;
  thumbnail_medium: string | null;
  thumbnail_high: string | null;
  subscriber_count: string | number | bigint | null;
  video_count: string | number | bigint | null;
  view_count: string | number | bigint | null;
  hidden_subscriber_count: boolean | null;
  uploads_playlist_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type LegacyYoutubeVideo = {
  video_id: string;
  owner_channel_id: string | null;
  title: string | null;
  description: string | null;
  published_at: Date | null;
  thumbnail_default: string | null;
  thumbnail_medium: string | null;
  thumbnail_high: string | null;
  thumbnail_standard: string | null;
  thumbnail_maxres: string | null;
  view_count: string | number | bigint | null;
  like_count: string | number | bigint | null;
  comment_count: string | number | bigint | null;
  duration_seconds: number | null;
  definition: string | null;
  caption: boolean | null;
  created_at: Date;
  updated_at: Date;
};

type LegacySpotifyArtist = {
  id: number;
  spotify_id: string;
  name: string;
  popularity: number | null;
  followers: string | number | bigint | null;
  genres: string[] | null;
  thumbnails: string[] | null;
  created_at: Date;
  updated_at: Date;
};

type LegacySpotifyTrack = {
  id: number;
  spotify_id: string;
  name: string;
  popularity: number | null;
  preview_url: string | null;
  isrc: string | null;
  duration_ms: number | null;
  release_date: string | null;
  thumbnails: string[] | null;
  musicbrainz_title: string | null;
  musicbrainz_artist_credit_id: string | null;
  musicbrainz_artist_id: string | null;
  musicbrainz_recording_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type LegacySpotifyArtistTrack = {
  spotify_artist_id: number;
  spotify_track_id: number;
  created_at: Date;
};

async function main() {
  const legacyUrl = stripPrismaQuery(requireEnv("LEGACY_DATABASE_URL"));
  const mediaUrl = stripPrismaQuery(requireEnv("MEDIA_DATABASE_URL"));
  const legacy = new Client({ connectionString: legacyUrl });
  const media = new Client({ connectionString: mediaUrl });

  await legacy.connect();
  await media.connect();

  try {
    const legacyData = await loadLegacyData(legacy);
    const prepared = prepareData(legacyData);

    printPlan(legacyData, prepared);

    if (!APPLY) {
      console.log("Dry run only. Re-run with --apply to write into media DB.");
      return;
    }

    await upsertYoutubeChannels(media, prepared.youtubeChannels);
    await upsertYoutubeVideos(media, prepared.youtubeVideos);
    await upsertSpotifyArtists(media, prepared.spotifyArtists);
    await upsertSpotifyTracks(media, prepared.spotifyTracks);
    await upsertSpotifyArtistTracks(media, prepared.spotifyArtistTracks);
    await upsertMusicBrainz(media, prepared.musicBrainzRows);
  } finally {
    await legacy.end();
    await media.end();
  }
}

async function loadLegacyData(legacy: Client) {
  console.log("Loading legacy media rows into memory...");
  const youtubeChannels = await legacy.query<LegacyYoutubeChannel>(`
      select id, channel_id, title, description, custom_url, published_at,
             country, default_language, thumbnail_default, thumbnail_medium,
             thumbnail_high, subscriber_count, video_count, view_count,
             hidden_subscriber_count, uploads_playlist_id, created_at, updated_at
      from youtube_channel
      where channel_id is not null
    `);
  const youtubeVideos = await legacy.query<LegacyYoutubeVideo>(`
      select video_id, owner_channel_id, title, description, published_at,
             thumbnail_default, thumbnail_medium, thumbnail_high,
             thumbnail_standard, thumbnail_maxres, view_count, like_count,
             comment_count, duration_seconds, definition, caption,
             created_at, updated_at
      from youtube_video
    `);
  const spotifyArtists = await legacy.query<LegacySpotifyArtist>(`
      select id, spotify_id, name, popularity, followers, genres, thumbnails,
             created_at, updated_at
      from spotify_artist
      where spotify_id is not null
    `);
  const spotifyTracks = await legacy.query<LegacySpotifyTrack>(`
      select id, spotify_id, name, popularity, preview_url, isrc, duration_ms,
             release_date, thumbnails, musicbrainz_title,
             musicbrainz_artist_credit_id, musicbrainz_artist_id,
             musicbrainz_recording_id, created_at, updated_at
      from spotify_track
      where spotify_id is not null
    `);
  const spotifyArtistTracks = await legacy.query<LegacySpotifyArtistTrack>(`
      select spotify_artist_id, spotify_track_id, created_at
      from spotify_artist_track
    `);

  return {
    youtubeChannels: youtubeChannels.rows,
    youtubeVideos: youtubeVideos.rows,
    spotifyArtists: spotifyArtists.rows,
    spotifyTracks: spotifyTracks.rows,
    spotifyArtistTracks: spotifyArtistTracks.rows,
  };
}

function prepareData(legacyData: Awaited<ReturnType<typeof loadLegacyData>>) {
  const youtubeChannelById = new Map<string, LegacyYoutubeChannel>();

  for (const channel of legacyData.youtubeChannels) {
    const current = youtubeChannelById.get(channel.channel_id);
    if (!current || isLaterChannelRow(channel, current)) {
      youtubeChannelById.set(channel.channel_id, channel);
    }
  }

  const youtubeChannels = Array.from(youtubeChannelById.values());
  const youtubeChannelIds = new Set(youtubeChannelById.keys());
  const youtubeVideos = legacyData.youtubeVideos.map((video) => ({
    ...video,
    channel_id:
      video.owner_channel_id && youtubeChannelIds.has(video.owner_channel_id)
        ? video.owner_channel_id
        : null,
  }));

  const spotifyArtistByLegacyId = new Map<number, string>();
  const spotifyArtists = dedupeByLastUpdated<LegacySpotifyArtist>(
    legacyData.spotifyArtists,
    (artist) => artist.spotify_id,
  );
  for (const artist of spotifyArtists) {
    spotifyArtistByLegacyId.set(artist.id, artist.spotify_id);
  }

  const spotifyTrackByLegacyId = new Map<number, string>();
  const spotifyTracks = dedupeByLastUpdated<LegacySpotifyTrack>(
    legacyData.spotifyTracks,
    (track) => track.spotify_id,
  );
  for (const track of spotifyTracks) {
    spotifyTrackByLegacyId.set(track.id, track.spotify_id);
  }

  const spotifyArtistTrackByKey = new Map<string, {
    spotify_artist_id: string;
    spotify_track_id: string;
    created_at: Date;
  }>();

  for (const link of legacyData.spotifyArtistTracks) {
    const spotifyArtistId = spotifyArtistByLegacyId.get(link.spotify_artist_id);
    const spotifyTrackId = spotifyTrackByLegacyId.get(link.spotify_track_id);
    if (!spotifyArtistId || !spotifyTrackId) {
      continue;
    }

    const key = `${spotifyArtistId}\u0000${spotifyTrackId}`;
    const current = spotifyArtistTrackByKey.get(key);
    if (!current || link.created_at > current.created_at) {
      spotifyArtistTrackByKey.set(key, {
        spotify_artist_id: spotifyArtistId,
        spotify_track_id: spotifyTrackId,
        created_at: link.created_at,
      });
    }
  }

  const musicBrainzByIsrc = new Map<string, {
    isrc: string;
    recording_id: string | null;
    title: string | null;
    artist_credit_id: string | null;
    artist_credit_name: string | null;
    created_at: Date;
    updated_at: Date;
  }>();

  for (const track of spotifyTracks) {
    const isrc = normalizeNullable(track.isrc);
    if (!isrc || !hasMusicBrainzData(track)) {
      continue;
    }

    const current = musicBrainzByIsrc.get(isrc);
    if (!current || track.updated_at > current.updated_at) {
      musicBrainzByIsrc.set(isrc, {
        isrc,
        recording_id: track.musicbrainz_recording_id,
        title: track.musicbrainz_title,
        artist_credit_id: track.musicbrainz_artist_credit_id,
        artist_credit_name: null,
        created_at: track.created_at,
        updated_at: track.updated_at,
      });
    }
  }

  return {
    youtubeChannels,
    youtubeVideos,
    spotifyArtists,
    spotifyTracks,
    spotifyArtistTracks: Array.from(spotifyArtistTrackByKey.values()),
    musicBrainzRows: Array.from(musicBrainzByIsrc.values()),
  };
}

function printPlan(
  legacyData: Awaited<ReturnType<typeof loadLegacyData>>,
  prepared: ReturnType<typeof prepareData>,
) {
  console.log("Import plan:");
  console.log(
    `  youtube_channel: ${legacyData.youtubeChannels.length} legacy rows -> ${prepared.youtubeChannels.length} media rows`,
  );
  console.log(`  youtube_video: ${prepared.youtubeVideos.length} rows`);
  console.log(
    `  spotify_artist: ${legacyData.spotifyArtists.length} legacy rows -> ${prepared.spotifyArtists.length} media rows`,
  );
  console.log(
    `  spotify_track: ${legacyData.spotifyTracks.length} legacy rows -> ${prepared.spotifyTracks.length} media rows`,
  );
  console.log(
    `  spotify_artist_track: ${legacyData.spotifyArtistTracks.length} legacy rows -> ${prepared.spotifyArtistTracks.length} media rows`,
  );
  console.log(`  musicbrainz: ${prepared.musicBrainzRows.length} rows`);
}

async function upsertYoutubeChannels(
  media: Client,
  rows: LegacyYoutubeChannel[],
) {
  console.log(`Writing youtube_channel (${rows.length})...`);
  for (const batch of chunks(rows, BATCH_SIZE)) {
    await insertBatch(
      media,
      "youtube_channel",
      [
        "id",
        "title",
        "description",
        "custom_url",
        "published_at",
        "country",
        "default_language",
        "thumbnail_default",
        "thumbnail_medium",
        "thumbnail_high",
        "subscriber_count",
        "video_count",
        "view_count",
        "hidden_subscriber_count",
        "uploads_playlist_id",
        "created_at",
        "updated_at",
      ],
      batch.map((row) => [
        row.channel_id,
        row.title,
        row.description,
        row.custom_url,
        row.published_at,
        row.country,
        row.default_language,
        row.thumbnail_default,
        row.thumbnail_medium,
        row.thumbnail_high,
        row.subscriber_count,
        row.video_count,
        row.view_count,
        row.hidden_subscriber_count,
        row.uploads_playlist_id,
        row.created_at,
        row.updated_at,
      ]),
      "id",
    );
  }
}

async function upsertYoutubeVideos(
  media: Client,
  rows: Array<LegacyYoutubeVideo & { channel_id: string | null }>,
) {
  console.log(`Writing youtube_video (${rows.length})...`);
  for (const batch of chunks(rows, BATCH_SIZE)) {
    await insertBatch(
      media,
      "youtube_video",
      [
        "id",
        "channel_id",
        "title",
        "description",
        "published_at",
        "thumbnail_default",
        "thumbnail_medium",
        "thumbnail_high",
        "thumbnail_standard",
        "thumbnail_maxres",
        "view_count",
        "like_count",
        "comment_count",
        "duration_seconds",
        "definition",
        "caption",
        "created_at",
        "updated_at",
      ],
      batch.map((row) => [
        row.video_id,
        row.channel_id,
        row.title,
        row.description,
        row.published_at,
        row.thumbnail_default,
        row.thumbnail_medium,
        row.thumbnail_high,
        row.thumbnail_standard,
        row.thumbnail_maxres,
        row.view_count,
        row.like_count,
        row.comment_count,
        row.duration_seconds,
        row.definition,
        row.caption,
        row.created_at,
        row.updated_at,
      ]),
      "id",
    );
  }
}

async function upsertSpotifyArtists(
  media: Client,
  rows: LegacySpotifyArtist[],
) {
  console.log(`Writing spotify_artist (${rows.length})...`);
  for (const batch of chunks(rows, BATCH_SIZE)) {
    await insertBatch(
      media,
      "spotify_artist",
      [
        "id",
        "name",
        "popularity",
        "followers",
        "genres",
        "images",
        "created_at",
        "updated_at",
      ],
      batch.map((row) => [
        row.spotify_id,
        row.name,
        row.popularity,
        row.followers,
        row.genres ?? [],
        row.thumbnails ?? [],
        row.created_at,
        row.updated_at,
      ]),
      "id",
    );
  }
}

async function upsertSpotifyTracks(media: Client, rows: LegacySpotifyTrack[]) {
  console.log(`Writing spotify_track (${rows.length})...`);
  for (const batch of chunks(rows, BATCH_SIZE)) {
    await insertBatch(
      media,
      "spotify_track",
      [
        "id",
        "name",
        "popularity",
        "preview_url",
        "isrc",
        "duration_ms",
        "release_date",
        "release_date_precision",
        "album_images",
        "created_at",
        "updated_at",
      ],
      batch.map((row) => [
        row.spotify_id,
        row.name,
        row.popularity,
        row.preview_url,
        normalizeNullable(row.isrc),
        row.duration_ms,
        row.release_date,
        null,
        row.thumbnails ?? [],
        row.created_at,
        row.updated_at,
      ]),
      "id",
    );
  }
}

async function upsertSpotifyArtistTracks(
  media: Client,
  rows: Array<{
    spotify_artist_id: string;
    spotify_track_id: string;
    created_at: Date;
  }>,
) {
  console.log(`Writing spotify_artist_track (${rows.length})...`);
  for (const batch of chunks(rows, BATCH_SIZE)) {
    const columns = [
      "spotify_artist_id",
      "spotify_track_id",
      "artist_order",
      "created_at",
    ];
    const values = batch.map((row) => [
      row.spotify_artist_id,
      row.spotify_track_id,
      0,
      row.created_at,
    ]);
    const { sql, params } = buildInsertSql(
      "spotify_artist_track",
      columns,
      values,
      "on conflict (spotify_artist_id, spotify_track_id) do update set artist_order = excluded.artist_order",
    );
    await media.query(sql, params);
  }
}

async function upsertMusicBrainz(
  media: Client,
  rows: Array<{
    isrc: string;
    recording_id: string | null;
    title: string | null;
    artist_credit_id: string | null;
    artist_credit_name: string | null;
    created_at: Date;
    updated_at: Date;
  }>,
) {
  console.log(`Writing musicbrainz (${rows.length})...`);
  for (const batch of chunks(rows, BATCH_SIZE)) {
    await insertBatch(
      media,
      "musicbrainz",
      [
        "isrc",
        "recording_id",
        "title",
        "artist_credit_id",
        "artist_credit_name",
        "created_at",
        "updated_at",
      ],
      batch.map((row) => [
        row.isrc,
        row.recording_id,
        row.title,
        row.artist_credit_id,
        row.artist_credit_name,
        row.created_at,
        row.updated_at,
      ]),
      "isrc",
    );
  }
}

async function insertBatch(
  client: Client,
  table: string,
  columns: string[],
  values: unknown[][],
  conflictColumn: string,
) {
  if (values.length === 0) {
    return;
  }

  const updateColumns = columns.filter((column) => column !== conflictColumn);
  const onConflict = `on conflict (${quoteIdent(conflictColumn)}) do update set ${updateColumns
    .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`)
    .join(", ")}`;
  const { sql, params } = buildInsertSql(table, columns, values, onConflict);
  await client.query(sql, params);
}

function buildInsertSql(
  table: string,
  columns: string[],
  values: unknown[][],
  onConflict: string,
) {
  const params: unknown[] = [];
  const valueSql = values
    .map((row) => {
      const placeholders = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    })
    .join(", ");
  const sql = `insert into ${quoteIdent(table)} (${columns
    .map(quoteIdent)
    .join(", ")}) values ${valueSql} ${onConflict}`;

  return { sql, params };
}

function isLaterChannelRow(
  candidate: LegacyYoutubeChannel,
  current: LegacyYoutubeChannel,
) {
  if (candidate.updated_at.getTime() !== current.updated_at.getTime()) {
    return candidate.updated_at > current.updated_at;
  }

  return candidate.id > current.id;
}

function dedupeByLastUpdated<T extends { id: number; updated_at: Date }>(
  rows: T[],
  getKey: (row: T) => string,
) {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = getKey(row);
    const current = byKey.get(key);
    if (
      !current ||
      row.updated_at > current.updated_at ||
      (row.updated_at.getTime() === current.updated_at.getTime() &&
        row.id > current.id)
    ) {
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values());
}

function hasMusicBrainzData(track: LegacySpotifyTrack) {
  return Boolean(
    track.musicbrainz_title ||
      track.musicbrainz_artist_credit_id ||
      track.musicbrainz_artist_id ||
      track.musicbrainz_recording_id,
  );
}

function normalizeNullable(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function chunks<T>(rows: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }

  return result;
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function stripPrismaQuery(url: string) {
  return url.replace(/\?.*$/, "");
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
