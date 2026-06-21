// TJ 200101 이후 누적 목록을 저장하고, artist 검색으로 추가 발견된 곡을 song_queue에 넣는 스크립트.
// pnpm tsx src/scripts/sync-tj-songs-and-queue.ts

import { config } from "dotenv";
import { Pool } from "pg";
import {
  getTjSongByArtist,
  TjService,
} from "../../../server/src/thirdparty/tj/index.js";
import type {
  TjSongData,
  TjSongInfo,
} from "../../../server/src/thirdparty/tj/index.js";

config({ override: true, quiet: true });

type TjSongRow = {
  id: string;
  title: string;
  artist: string | null;
  lyricist: string | null;
  composer: string | null;
  thumbnailImg: string | null;
  publishdate: string | null;
  isMR: boolean;
  isMV: boolean;
  isOver60: boolean;
  youtubeLink: string | null;
};

type SyncStats = {
  apiFetched: number;
  apiNewQueued: number;
  artistSearchCount: number;
  artistSearchErrors: number;
  searchFetched: number;
  searchNewQueued: number;
};

const FULL_SCAN_FROM_YEAR_MONTH = "200101";
const ARTIST_SEARCH_DELAY_MS = 300;
const DB_BATCH_SIZE = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function fromApiSong(song: TjSongData): TjSongRow {
  return {
    id: song.karaokeNo,
    title: song.title,
    artist: toNullable(song.artist),
    lyricist: toNullable(song.lyricist),
    composer: toNullable(song.composer),
    thumbnailImg: song.thumbnailImg ?? null,
    publishdate: toNullable(song.publishdate),
    isMR: false,
    isMV: song.isMV,
    isOver60: false,
    youtubeLink: null,
  };
}

function fromSearchSong(song: TjSongInfo): TjSongRow {
  return {
    id: song.songNumber,
    title: song.title,
    artist: toNullable(song.artist),
    lyricist: toNullable(song.lyricist),
    composer: toNullable(song.composer),
    thumbnailImg: null,
    publishdate: null,
    isMR: song.isMR,
    isMV: song.isMV,
    isOver60: song.isOver60,
    youtubeLink: song.youtubeLink ?? null,
  };
}

function dedupeById(songs: TjSongRow[]): TjSongRow[] {
  const map = new Map<string, TjSongRow>();

  for (const song of songs) {
    if (!map.has(song.id)) {
      map.set(song.id, song);
    }
  }

  return Array.from(map.values());
}

async function fetchTjArtistSearchNames(pool: Pool): Promise<string[]> {
  const result = await pool.query<{
    name: string;
  }>(`
    select name
    from artist;
  `);
  const artists = new Set<string>();

  for (const row of result.rows) {
    const trimmed = row.name.trim();
    if (trimmed) {
      artists.add(trimmed);
    }
  }

  return Array.from(artists).sort((a, b) => a.localeCompare(b));
}

async function fetchExistingTjSongIds(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ id: string }>("select id from tj_song");
  return new Set(result.rows.map((row) => row.id));
}

async function upsertTjSongs(pool: Pool, songs: TjSongRow[]): Promise<void> {
  for (let start = 0; start < songs.length; start += DB_BATCH_SIZE) {
    const batch = songs.slice(start, start + DB_BATCH_SIZE);

    await pool.query(
      `
        insert into tj_song (
          id,
          title,
          artist,
          lyricist,
          composer,
          thumbnail_img,
          publishdate,
          is_mr,
          is_mv,
          is_over_60,
          youtube_link,
          updated_at
        )
        select *
        from unnest(
          $1::text[],
          $2::text[],
          $3::text[],
          $4::text[],
          $5::text[],
          $6::text[],
          $7::text[],
          $8::boolean[],
          $9::boolean[],
          $10::boolean[],
          $11::text[],
          $12::timestamp[]
        )
        on conflict (id) do update
        set
          title = excluded.title,
          artist = excluded.artist,
          lyricist = coalesce(excluded.lyricist, tj_song.lyricist),
          composer = coalesce(excluded.composer, tj_song.composer),
          thumbnail_img = coalesce(excluded.thumbnail_img, tj_song.thumbnail_img),
          publishdate = coalesce(excluded.publishdate, tj_song.publishdate),
          is_mr = tj_song.is_mr or excluded.is_mr,
          is_mv = tj_song.is_mv or excluded.is_mv,
          is_over_60 = tj_song.is_over_60 or excluded.is_over_60,
          youtube_link = coalesce(excluded.youtube_link, tj_song.youtube_link),
          updated_at = now();
      `,
      [
        batch.map((song) => song.id),
        batch.map((song) => song.title),
        batch.map((song) => song.artist),
        batch.map((song) => song.lyricist),
        batch.map((song) => song.composer),
        batch.map((song) => song.thumbnailImg),
        batch.map((song) => song.publishdate),
        batch.map((song) => song.isMR),
        batch.map((song) => song.isMV),
        batch.map((song) => song.isOver60),
        batch.map((song) => song.youtubeLink),
        batch.map(() => new Date()),
      ],
    );
  }
}

async function enqueueSongs(pool: Pool, songs: TjSongRow[]): Promise<void> {
  for (let start = 0; start < songs.length; start += DB_BATCH_SIZE) {
    const batch = songs.slice(start, start + DB_BATCH_SIZE);

    await pool.query(
      `
        insert into song_queue (tj_number, title, artist, publishdate, catalog)
        select *
        from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])
        on conflict (tj_number) do update
        set
          title = excluded.title,
          artist = excluded.artist,
          publishdate = coalesce(excluded.publishdate, song_queue.publishdate),
          catalog = coalesce(excluded.catalog, song_queue.catalog);
      `,
      [
        batch.map((song) => song.id),
        batch.map((song) => song.title),
        batch.map((song) => song.artist),
        batch.map((song) => song.publishdate),
        batch.map(() => null),
      ],
    );
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const pool = new Pool({ connectionString });
  const tjService = new TjService();
  const stats: SyncStats = {
    apiFetched: 0,
    apiNewQueued: 0,
    artistSearchCount: 0,
    artistSearchErrors: 0,
    searchFetched: 0,
    searchNewQueued: 0,
  };

  try {
    const knownIds = await fetchExistingTjSongIds(pool);

    console.log(`TJ 누적 API 조회 시작: searchYm=${FULL_SCAN_FROM_YEAR_MONTH}`);
    const apiSongs = dedupeById(
      (await tjService.fetchSongsFromYearMonth(FULL_SCAN_FROM_YEAR_MONTH)).map(
        fromApiSong,
      ),
    );
    stats.apiFetched = apiSongs.length;

    const apiNewSongs = apiSongs.filter((song) => !knownIds.has(song.id));

    await upsertTjSongs(pool, apiSongs);
    await enqueueSongs(pool, apiNewSongs);

    for (const song of apiSongs) {
      knownIds.add(song.id);
    }
    stats.apiNewQueued = apiNewSongs.length;

    const artistNames = await fetchTjArtistSearchNames(pool);
    console.log(
      `TJ 누적 API 저장 완료: ${apiSongs.length}곡, 신규 큐 ${apiNewSongs.length}곡`,
    );
    console.log(`artist 검색 시작: ${artistNames.length}개`);

    for (let index = 0; index < artistNames.length; index++) {
      const artistName = artistNames[index];

      try {
        const searchedSongs = dedupeById(
          (await getTjSongByArtist(artistName)).map(fromSearchSong),
        );
        stats.artistSearchCount++;
        stats.searchFetched += searchedSongs.length;

        const newSongs = searchedSongs.filter((song) => !knownIds.has(song.id));

        await upsertTjSongs(pool, searchedSongs);
        await enqueueSongs(pool, newSongs);

        for (const song of searchedSongs) {
          knownIds.add(song.id);
        }

        stats.searchNewQueued += newSongs.length;
        console.log(
          `[${index + 1}/${artistNames.length}] ${artistName}: 검색 ${searchedSongs.length}곡, 신규 큐 ${newSongs.length}곡`,
        );
      } catch (error) {
        stats.artistSearchErrors++;
        console.log(
          `[${index + 1}/${artistNames.length}] ${artistName}: 검색 실패 (${error})`,
        );
      }

      await sleep(ARTIST_SEARCH_DELAY_MS);
    }

    console.log("TJ 전수조사 완료");
    console.table([stats]);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
