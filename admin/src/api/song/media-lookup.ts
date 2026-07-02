import { Client } from "pg";

export type YoutubeVideoInfo = {
  id: string;
  title: string | null;
  thumbnailMedium: string | null;
  viewCount: string | null;
};

export type SpotifyTrackInfo = {
  id: string;
  name: string | null;
  releaseDate: string | null;
  albumImage: string | null;
};

type YoutubeVideoRow = {
  id: string;
  title: string | null;
  thumbnail_medium: string | null;
  view_count: string | null;
};

type SpotifyTrackRow = {
  id: string;
  name: string | null;
  release_date: string | null;
  album_images: string[] | null;
};

// song 조인 테이블에는 ID만 있으므로, UI 표시용 제목/썸네일은 media db에서 배치 조회한다.
export async function findYoutubeVideoInfos(
  youtubeVideoIds: string[],
): Promise<Map<string, YoutubeVideoInfo>> {
  if (youtubeVideoIds.length === 0) {
    return new Map();
  }

  const rows = await queryMediaDatabase<YoutubeVideoRow>(
    `
      select id, title, thumbnail_medium, view_count
      from youtube_video
      where id = any($1::text[])
    `,
    [youtubeVideoIds],
  );

  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        title: row.title,
        thumbnailMedium: row.thumbnail_medium,
        viewCount: row.view_count,
      },
    ]),
  );
}

export async function findSpotifyTrackInfos(
  spotifyTrackIds: string[],
): Promise<Map<string, SpotifyTrackInfo>> {
  if (spotifyTrackIds.length === 0) {
    return new Map();
  }

  const rows = await queryMediaDatabase<SpotifyTrackRow>(
    `
      select id, name, release_date, album_images
      from spotify_track
      where id = any($1::text[])
    `,
    [spotifyTrackIds],
  );

  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        releaseDate: row.release_date,
        albumImage: row.album_images?.[0] ?? null,
      },
    ]),
  );
}

async function queryMediaDatabase<Row extends object>(
  sql: string,
  params: unknown[],
): Promise<Row[]> {
  const client = new Client({
    connectionString: getMediaDatabaseUrl(),
  });

  await client.connect();

  try {
    const result = await client.query<Row>(sql, params);

    return result.rows;
  } finally {
    await client.end();
  }
}

function getMediaDatabaseUrl(): string {
  const databaseUrl = process.env.MEDIA_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("MEDIA_DATABASE_URL is required");
  }

  return databaseUrl;
}
