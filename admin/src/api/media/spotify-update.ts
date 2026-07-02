import type { Client } from "pg";
import { getAccessToken } from "../collection/artist-creation-queue/spotify/index";
import { withMediaDb } from "./media-db";

/**
 * 스포티파이 아티스트 갱신 (호출 절약 전략)
 * - 캐시된 client credentials 토큰 재사용 (토큰 발급 호출 최소화)
 * - 트랙 상세(popularity, ISRC)는 media DB에 없는 신규 트랙만 조회
 *
 * 배치 엔드포인트(/albums?ids=, /tracks?ids=)는 이 앱 권한에서 403이라 단건 조회를 쓴다.
 * /artists/{id}/albums 의 limit 최대값도 10으로 제한되어 있다. (2026-07 확인)
 */

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const ALBUM_LIST_PAGE_SIZE = 10;

export type SpotifyArtistUpdateResult = {
  artistId: string;
  name: string;
  albumCount: number;
  newTrackCount: number;
  linkedTrackCount: number;
  apiCallCount: number;
};

type SpotifyImage = { url: string };

type SpotifyArtistResponse = {
  id: string;
  name: string;
  popularity?: number;
  followers?: { total?: number };
  genres?: string[];
  images?: SpotifyImage[];
};

type SpotifyPaging<T> = {
  items: T[];
  next: string | null;
};

type SimplifiedAlbum = {
  id: string;
  release_date?: string;
  release_date_precision?: string;
  images?: SpotifyImage[];
};

type SimplifiedTrack = {
  id: string;
  name: string;
  duration_ms?: number;
  artists: Array<{ id: string; name: string }>;
};

type FullAlbum = SimplifiedAlbum & {
  tracks: SpotifyPaging<SimplifiedTrack>;
};

type FullTrack = {
  id: string;
  name: string;
  popularity?: number;
  preview_url?: string | null;
  duration_ms?: number;
  external_ids?: { isrc?: string };
};

type CandidateTrack = {
  id: string;
  name: string;
  durationMs: number | null;
  artistOrder: number;
  releaseDate: string | null;
  releaseDatePrecision: string | null;
  albumImages: string[];
};

export async function updateSpotifyArtist(
  artistId: string,
): Promise<SpotifyArtistUpdateResult> {
  const counter = { count: 0 };
  const artist = await spotifyFetch<SpotifyArtistResponse>(
    new URL(`${SPOTIFY_API_BASE}/artists/${artistId}`),
    counter,
  );
  const albums = await fetchAllArtistAlbums(artistId, counter);
  const candidates = await collectCandidateTracks(artistId, albums, counter);

  return withMediaDb(async (client) => {
    await upsertArtist(client, artist);

    const candidateIds = [...candidates.keys()];
    const existingIds = await findExistingTrackIds(client, candidateIds);
    const newIds = candidateIds.filter((id) => !existingIds.has(id));
    const newTracks: FullTrack[] = [];

    for (const trackId of newIds) {
      const track = await spotifyFetch<FullTrack>(
        new URL(`${SPOTIFY_API_BASE}/tracks/${trackId}`),
        counter,
      );
      newTracks.push(track);
    }

    await insertTracks(client, newTracks, candidates);

    const linkedTrackCount = await upsertArtistTrackLinks(
      client,
      artistId,
      candidates,
    );

    return {
      artistId,
      name: artist.name,
      albumCount: albums.length,
      newTrackCount: newIds.length,
      linkedTrackCount,
      apiCallCount: counter.count,
    };
  });
}

async function fetchAllArtistAlbums(
  artistId: string,
  counter: { count: number },
): Promise<SimplifiedAlbum[]> {
  const albums: SimplifiedAlbum[] = [];
  const firstUrl = new URL(`${SPOTIFY_API_BASE}/artists/${artistId}/albums`);

  firstUrl.searchParams.set("include_groups", "album,single");
  firstUrl.searchParams.set("limit", String(ALBUM_LIST_PAGE_SIZE));

  let next: string | null = firstUrl.toString();

  while (next) {
    const page = await spotifyFetch<SpotifyPaging<SimplifiedAlbum>>(
      new URL(next),
      counter,
    );
    albums.push(...page.items);
    next = page.next;
  }

  return albums;
}

async function collectCandidateTracks(
  artistId: string,
  albums: SimplifiedAlbum[],
  counter: { count: number },
): Promise<Map<string, CandidateTrack>> {
  const candidates = new Map<string, CandidateTrack>();

  for (const albumSummary of albums) {
    const album = await spotifyFetch<FullAlbum>(
      new URL(`${SPOTIFY_API_BASE}/albums/${albumSummary.id}`),
      counter,
    );

    let tracks = album.tracks.items;
    let next = album.tracks.next;

    // 트랙 50개를 넘는 앨범만 추가 페이지 조회
    while (next) {
      const page = await spotifyFetch<SpotifyPaging<SimplifiedTrack>>(
        new URL(next),
        counter,
      );
      tracks = tracks.concat(page.items);
      next = page.next;
    }

    for (const track of tracks) {
      if (!track?.id || candidates.has(track.id)) continue;

      const artistOrder = track.artists.findIndex(
        (trackArtist) => trackArtist.id === artistId,
      );

      if (artistOrder < 0) continue;

      candidates.set(track.id, {
        id: track.id,
        name: track.name,
        durationMs: track.duration_ms ?? null,
        artistOrder,
        releaseDate: album.release_date ?? null,
        releaseDatePrecision: album.release_date_precision ?? null,
        albumImages: album.images?.map((image) => image.url) ?? [],
      });
    }
  }

  return candidates;
}

async function upsertArtist(
  client: Client,
  artist: SpotifyArtistResponse,
): Promise<void> {
  await client.query(
    `
      insert into spotify_artist (
        id, name, popularity, followers, genres, images, fetched_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, now(), now())
      on conflict (id) do update set
        name = excluded.name,
        -- 앱 권한에 따라 API가 popularity/followers/genres를 안 줄 수 있어 기존 값을 지키며 갱신한다.
        popularity = coalesce(excluded.popularity, spotify_artist.popularity),
        followers = coalesce(excluded.followers, spotify_artist.followers),
        genres = case
          when excluded.genres = '{}' then spotify_artist.genres
          else excluded.genres
        end,
        images = case
          when excluded.images = '{}' then spotify_artist.images
          else excluded.images
        end,
        fetched_at = now(),
        updated_at = now()
    `,
    [
      artist.id,
      artist.name,
      artist.popularity ?? null,
      artist.followers?.total ?? null,
      artist.genres ?? [],
      artist.images?.map((image) => image.url) ?? [],
    ],
  );
}

async function findExistingTrackIds(
  client: Client,
  trackIds: string[],
): Promise<Set<string>> {
  if (trackIds.length === 0) {
    return new Set();
  }

  const result = await client.query<{ id: string }>(
    "select id from spotify_track where id = any($1::text[])",
    [trackIds],
  );

  return new Set(result.rows.map((row) => row.id));
}

async function insertTracks(
  client: Client,
  tracks: FullTrack[],
  candidates: Map<string, CandidateTrack>,
): Promise<void> {
  if (tracks.length === 0) {
    return;
  }

  const rows = tracks.map((track) => {
    const candidate = candidates.get(track.id);

    return {
      id: track.id,
      name: track.name,
      popularity: track.popularity ?? null,
      preview_url: track.preview_url ?? null,
      isrc: track.external_ids?.isrc ?? null,
      duration_ms: track.duration_ms ?? candidate?.durationMs ?? null,
      release_date: candidate?.releaseDate ?? null,
      release_date_precision: candidate?.releaseDatePrecision ?? null,
      album_images: candidate?.albumImages ?? [],
    };
  });

  await client.query(
    `
      insert into spotify_track (
        id, name, popularity, preview_url, isrc, duration_ms,
        release_date, release_date_precision, album_images, updated_at
      )
      select
        r.id, r.name, r.popularity, r.preview_url, r.isrc, r.duration_ms,
        r.release_date, r.release_date_precision,
        coalesce(
          array(select jsonb_array_elements_text(r.album_images)),
          '{}'
        ),
        now()
      from jsonb_to_recordset($1::jsonb) as r(
        id text, name text, popularity int, preview_url text, isrc text,
        duration_ms int, release_date text, release_date_precision text,
        album_images jsonb
      )
      on conflict (id) do nothing
    `,
    [JSON.stringify(rows)],
  );
}

async function upsertArtistTrackLinks(
  client: Client,
  artistId: string,
  candidates: Map<string, CandidateTrack>,
): Promise<number> {
  if (candidates.size === 0) {
    return 0;
  }

  const rows = [...candidates.values()].map((candidate) => ({
    id: candidate.id,
    artist_order: candidate.artistOrder,
  }));

  const result = await client.query(
    `
      insert into spotify_artist_track (
        spotify_artist_id, spotify_track_id, artist_order
      )
      select $1, r.id, r.artist_order
      from jsonb_to_recordset($2::jsonb) as r(id text, artist_order int)
      where exists (select 1 from spotify_track t where t.id = r.id)
      on conflict (spotify_artist_id, spotify_track_id) do nothing
    `,
    [artistId, JSON.stringify(rows)],
  );

  return result.rowCount ?? 0;
}

async function spotifyFetch<T>(
  url: URL,
  counter: { count: number },
): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = await getAccessToken();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    counter.count += 1;

    if (response.status === 429) {
      const retryAfterSeconds = Number(
        response.headers.get("retry-after") ?? "1",
      );
      await sleep((retryAfterSeconds + 0.5) * 1000);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Spotify API 요청 실패 (${response.status}): ${url.pathname} ${body}`,
      );
    }

    return (await response.json()) as T;
  }

  throw new Error(`Spotify rate limit 재시도 초과: ${url.pathname}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
