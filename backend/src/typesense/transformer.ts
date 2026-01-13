import type { PrismaClient } from "@prisma/client";
import {
  calculateArtistPopularity,
  calculateSongPopularity,
} from "./lib/popularity";
import {
  cleanText,
  detectJapaneseType,
  hasMixedKana,
  katakanaToHiragana,
  normalizeSpacing,
  removeSpaces,
  toAllHiragana,
  toAllKatakana,
} from "./lib/text-utils";

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

export type ArtistWithRelations = Awaited<
  ReturnType<PrismaClient["artist"]["findMany"]>
>[number] & {
  artistSongs?: Array<{
    song?: {
      tjSong?: {
        id: string;
      };
    };
  }>;
  spotifyArtist?: {
    popularity?: number;
  };
  nameLatin?: string;
  nameJaKana?: string;
  nameJaKanji?: string;
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

export interface TypesenseArtistDocument {
  id: string;
  homeCatalog?: string;

  nameKo?: string;
  nameJaKanji?: string;
  nameJaKana?: string;
  nameLatin?: string;

  popularity?: number;
  spotifyPopularity?: number;
  tjSongCount?: number;
  updatedAt: number;

  q_name_ko_p?: string[];
  q_name_ko_a?: string[];
  q_name_ko_norm?: string[];

  q_name_latin_p?: string[];
  q_name_latin_a?: string[];
  q_name_latin_norm?: string[];

  q_name_ja_kanji_p?: string[];
  q_name_ja_kanji_a?: string[];
  q_name_ja_kanji_norm?: string[];

  q_name_ja_kana_p?: string[];
  q_name_ja_kana_a?: string[];
  q_name_ja_kana_norm?: string[];
}

function addJapaneseVariants(
  values: Set<string>,
  text?: string,
  options?: { includeNormalized?: boolean },
) {
  if (!text) {
    return;
  }

  const includeNormalized = options?.includeNormalized ?? true;
  const noSpaceAndPunct = cleanText(removeSpaces(text));
  if (includeNormalized && noSpaceAndPunct !== text) {
    values.add(noSpaceAndPunct);
  }

  const hiragana = toAllHiragana(text);
  if (hiragana !== text) {
    values.add(hiragana);
  }

  const katakana = toAllKatakana(text);
  if (katakana !== text) {
    values.add(katakana);
  }

  if (includeNormalized) {
    const noSpaceAndPunctHiragana = toAllHiragana(noSpaceAndPunct);
    if (
      noSpaceAndPunctHiragana !== noSpaceAndPunct &&
      noSpaceAndPunctHiragana !== hiragana
    ) {
      values.add(noSpaceAndPunctHiragana);
    }

    const noSpaceAndPunctKatakana = toAllKatakana(noSpaceAndPunct);
    if (
      noSpaceAndPunctKatakana !== noSpaceAndPunct &&
      noSpaceAndPunctKatakana !== katakana
    ) {
      values.add(noSpaceAndPunctKatakana);
    }
  }
}

function addNormalizedValue(values: Set<string>, text?: string) {
  const normalized = normalizeBasic(text);
  if (normalized) {
    values.add(normalized);
  }
}

function addJapaneseNormalizedValues(values: Set<string>, text?: string) {
  if (!text) {
    return;
  }
  addJapaneseVariants(values, text);
  const normalized = normalizeBasic(text);
  if (normalized) {
    values.add(normalized);
  }
}

function normalizeBasic(text?: string) {
  if (!text) {
    return undefined;
  }

  const spaced = normalizeSpacing(text);
  if (!spaced) {
    return undefined;
  }
  const normalized = removeSpaces(spaced);
  return normalized.length > 0 ? normalized : undefined;
}

function buildNormalizedValues(value?: string): string[] | undefined {
  const normalized = normalizeBasic(value);
  return normalized ? [normalized] : undefined;
}

function buildJapaneseNormalizedValues(
  value?: string,
): string[] | undefined {
  const values = new Set<string>();
  addJapaneseNormalizedValues(values, value);
  return values.size > 0 ? Array.from(values) : undefined;
}

function buildPrimaryValues(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeSpacing(value);
  const results = new Set<string>();
  if (value.trim().length > 0) {
    results.add(value);
  }
  if (normalized && normalized !== value) {
    results.add(normalized);
  }
  return results.size > 0 ? Array.from(results) : undefined;
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


/**
 * DB Artist → Typesense Artist Document 변환
 */
export function transformArtistToDocument(
  artist: ArtistWithRelations,
): TypesenseArtistDocument {
  const nameKo = artist.nameKo;
  const nameLatin = artist.nameLatin;
  const nameJaKanji = artist.nameJaKanji;
  const nameJaKana = artist.nameJaKana;

  const artistSongs = artist.artistSongs ?? [];
  const tjSongCount = artistSongs.reduce((count, artistSong) => {
    return artistSong.song?.tjSong ? count + 1 : count;
  }, 0);

  const spotifyPopularity = artist.spotifyArtist?.popularity ?? undefined;
  const hasPopularitySource =
    spotifyPopularity !== undefined || tjSongCount > 0;
  const popularity = hasPopularitySource
    ? calculateArtistPopularity(spotifyPopularity, tjSongCount)
    : undefined;

  const q_name_ko_p = buildPrimaryValues(nameKo);
  const q_name_latin_p = buildPrimaryValues(nameLatin);
  const q_name_ja_kanji_p = buildPrimaryValues(nameJaKanji);
  const q_name_ja_kana_p = buildPrimaryValues(nameJaKana);

  const q_name_ko_norm = buildNormalizedValues(nameKo);
  const q_name_latin_norm = buildNormalizedValues(nameLatin);
  const q_name_ja_kanji_norm = buildJapaneseNormalizedValues(nameJaKanji);
  const q_name_ja_kana_norm = buildJapaneseNormalizedValues(nameJaKana);

  return {
    id: artist.id.toString(),
    homeCatalog: artist.homeCatalog ?? undefined,

    nameKo: nameKo ?? undefined,
    nameJaKanji: nameJaKanji ?? undefined,
    nameJaKana: nameJaKana ?? undefined,
    nameLatin: nameLatin ?? undefined,

    popularity,
    spotifyPopularity,
    tjSongCount,
    updatedAt: Math.floor(artist.updatedAt.getTime() / 1000),

    q_name_ko_p,
    q_name_ko_norm,

    q_name_latin_p,
    q_name_latin_norm,

    q_name_ja_kanji_p,
    q_name_ja_kanji_norm,

    q_name_ja_kana_p,
    q_name_ja_kana_norm,
  };
}
