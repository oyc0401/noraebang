import type { PrismaClient } from "@prisma/client";
import {
  calculateArtistPopularity,
  calculateSongPopularity,
} from "./lib/popularity";
import { removeSpaces } from "./lib/text-utils";
import {
  addJapaneseNormalizedValues,
  addNormalizedValue,
  buildJapaneseNormalizedValues,
  buildNormalizedValues,
  buildPrimaryValues,
} from "./transformer-utils";

export type SongWithRelations = Awaited<
  ReturnType<PrismaClient["song"]["findMany"]>
>[number] & {
  artistSongs: Array<{
    artist: {
      id: number;
      name: string;
      nameKo: string;
      nameLatin?: string;
      nameJaKana?: string;
      nameJaKanji?: string;
      spotifyArtist?: {
        popularity?: number;
      };
      tjSongs?: Array<{
        tjSongId: string;
      }>;
    };
  }>;
  tjSongId?: string;
  tjSong?: {
    id: string;
  };
  spotifyTrack?: {
    spotifyTrack?: {
      popularity?: number;
    };
  };
  titleKo?: string;
  titleLatin?: string;
  titleJaKana?: string;
  titleJaKanji?: string;
};

export interface TypesenseSongDocument {
  id: string;
  catalog?: string;

  titleKo?: string;
  titleJaKanji?: string;
  titleJaKana?: string;
  titleLatin?: string;

  artistIds: string[];

  tjSongId?: string;

  songPopularity?: number;
  artistPopularity?: number;
  spotifyTrackPopularity?: number;
  artistSpotifyPopularity?: number;
  artistTjSongCount?: number;
  hasTjSong?: boolean;
  updatedAt: number;

  q_song_ko_p?: string[];
  q_song_ko_a?: string[];
  q_song_ko_norm?: string[];

  q_song_latin_p?: string[];
  q_song_latin_a?: string[];
  q_song_latin_norm?: string[];

  q_song_ja_kanji_p?: string[];
  q_song_ja_kanji_a?: string[];
  q_song_ja_kanji_norm?: string[];

  q_song_ja_kana_p?: string[];
  q_song_ja_kana_a?: string[];
  q_song_ja_kana_norm?: string[];

  q_artist_ko_p?: string[];
  q_artist_ko_a?: string[];
  q_artist_ko_norm?: string[];

  q_artist_latin_p?: string[];
  q_artist_latin_a?: string[];
  q_artist_latin_norm?: string[];

  q_artist_ja_kanji_norm?: string[];
  q_artist_ja_kana_norm?: string[];

  q_artist_ja_kanji_p?: string[];
  q_artist_ja_kanji_a?: string[];

  q_artist_ja_kana_p?: string[];
  q_artist_ja_kana_a?: string[];

  q_combo_a?: string[];
}

function addPrimaryVariants(target: string[], value?: string) {
  const variants = buildPrimaryValues(value);
  if (!variants) {
    return;
  }
  for (const variant of variants) {
    if (!target.includes(variant)) {
      target.push(variant);
    }
  }
}

/**
 * DB Song → Typesense Document 변환
 */
export function transformSongToDocument(
  song: SongWithRelations,
): TypesenseSongDocument {
  const artists = song.artistSongs.map((as) => as.artist);
  const mainArtist = artists[0];

  const titleKo = song.titleKo;
  const titleJaKanji = song.titleJaKanji;
  const titleJaKana = song.titleJaKana;
  const titleLatin = song.titleLatin;

  const tjSongId = song.tjSongId ?? song.tjSong?.id ?? undefined;

  const spotifyTrackPopularity =
    song.spotifyTrack?.spotifyTrack?.popularity ?? undefined;
  const artistSpotifyPopularity =
    mainArtist?.spotifyArtist?.popularity ?? undefined;
  const mainArtistTjSongCount = mainArtist?.tjSongs?.length ?? 0;
  const artistTjSongCount =
    mainArtistTjSongCount > 0 ? mainArtistTjSongCount : undefined;
  const hasArtistPopularitySource =
    artistSpotifyPopularity !== undefined || artistTjSongCount !== undefined;
  const artistPopularity = hasArtistPopularitySource
    ? calculateArtistPopularity(artistSpotifyPopularity, artistTjSongCount ?? 0)
    : undefined;
  const hasTjSong = Boolean(tjSongId);
  const songPopularity = calculateSongPopularity({
    artistPopularity,
    spotifyTrackPopularity,
    hasTjSong,
  });

  const q_combo_a: string[] = [];
  const songKoNoSpace = titleKo ? removeSpaces(titleKo) : undefined;
  const artistKoNoSpace = mainArtist?.nameKo
    ? removeSpaces(mainArtist.nameKo)
    : undefined;

  if (songKoNoSpace && artistKoNoSpace) {
    q_combo_a.push(`${songKoNoSpace}${artistKoNoSpace}`);
  }

  const q_song_ko_p = buildPrimaryValues(titleKo);
  const q_song_ja_kanji_p = buildPrimaryValues(titleJaKanji);
  const q_song_ja_kana_p = buildPrimaryValues(titleJaKana);
  const q_song_latin_p = buildPrimaryValues(titleLatin);

  const q_song_ko_norm = buildNormalizedValues(titleKo);
  const q_song_latin_norm = buildNormalizedValues(titleLatin);
  const q_song_ja_kanji_norm = buildJapaneseNormalizedValues(titleJaKanji);
  const q_song_ja_kana_norm = buildJapaneseNormalizedValues(titleJaKana);

  const q_artist_ko_p_values: string[] = [];
  const q_artist_latin_p_values: string[] = [];
  const q_artist_ja_kanji_p_values: string[] = [];
  const q_artist_ja_kana_p_values: string[] = [];

  for (const artist of artists) {
    addPrimaryVariants(q_artist_ko_p_values, artist.nameKo);
    addPrimaryVariants(q_artist_latin_p_values, artist.nameLatin);
    addPrimaryVariants(q_artist_ja_kanji_p_values, artist.nameJaKanji);
    addPrimaryVariants(q_artist_ja_kana_p_values, artist.nameJaKana);
  }

  const q_artist_ko_p =
    q_artist_ko_p_values.length > 0 ? q_artist_ko_p_values : undefined;
  const q_artist_latin_p =
    q_artist_latin_p_values.length > 0 ? q_artist_latin_p_values : undefined;
  const q_artist_ja_kanji_p =
    q_artist_ja_kanji_p_values.length > 0
      ? q_artist_ja_kanji_p_values
      : undefined;
  const q_artist_ja_kana_p =
    q_artist_ja_kana_p_values.length > 0
      ? q_artist_ja_kana_p_values
      : undefined;

  const q_artist_ko_norm_values = new Set<string>();
  const q_artist_latin_norm_values = new Set<string>();
  const q_artist_ja_kanji_norm_values = new Set<string>();
  const q_artist_ja_kana_norm_values = new Set<string>();

  for (const artist of artists) {
    addNormalizedValue(q_artist_ko_norm_values, artist.nameKo);
    addNormalizedValue(q_artist_latin_norm_values, artist.nameLatin);
    addJapaneseNormalizedValues(
      q_artist_ja_kanji_norm_values,
      artist.nameJaKanji,
    );
    addJapaneseNormalizedValues(
      q_artist_ja_kana_norm_values,
      artist.nameJaKana,
    );
  }

  const q_artist_ko_norm =
    q_artist_ko_norm_values.size > 0
      ? Array.from(q_artist_ko_norm_values)
      : undefined;
  const q_artist_latin_norm =
    q_artist_latin_norm_values.size > 0
      ? Array.from(q_artist_latin_norm_values)
      : undefined;
  const q_artist_ja_kanji_norm =
    q_artist_ja_kanji_norm_values.size > 0
      ? Array.from(q_artist_ja_kanji_norm_values)
      : undefined;
  const q_artist_ja_kana_norm =
    q_artist_ja_kana_norm_values.size > 0
      ? Array.from(q_artist_ja_kana_norm_values)
      : undefined;

  return {
    id: song.id.toString(),
    catalog: song.catalog ?? undefined,

    titleKo: titleKo ?? undefined,
    titleJaKanji: titleJaKanji ?? undefined,
    titleJaKana: titleJaKana ?? undefined,
    titleLatin: titleLatin ?? undefined,

    artistIds: artists.map((a) => a.id.toString()),

    tjSongId,

    songPopularity,
    artistPopularity,
    spotifyTrackPopularity,
    artistSpotifyPopularity,
    artistTjSongCount,
    hasTjSong,
    updatedAt: Math.floor(song.updatedAt.getTime() / 1000),

    q_song_ko_p,
    q_song_ko_norm,

    q_song_latin_p,
    q_song_latin_norm,

    q_song_ja_kanji_p,
    q_song_ja_kanji_norm,

    q_song_ja_kana_p,
    q_song_ja_kana_norm,

    q_artist_ko_p,
    q_artist_ko_norm,

    q_artist_latin_p,
    q_artist_latin_norm,

    q_artist_ja_kanji_p,
    q_artist_ja_kanji_norm,

    q_artist_ja_kana_p,
    q_artist_ja_kana_norm,

    q_combo_a: q_combo_a.length > 0 ? q_combo_a : undefined,
  };
}
