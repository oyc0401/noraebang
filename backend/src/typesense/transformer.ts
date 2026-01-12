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
  removeBrackets,
  toAllHiragana,
  toAllKatakana,
} from "./lib/text-utils";

export type SongWithRelations = Awaited<
  ReturnType<PrismaClient["song"]["findMany"]>
>[number] & {
  aliases: Array<{
    alias: string;
    locale: string;
    kind: string;
    source: string;
  }>;
  artistSongs: Array<{
    artist: {
      id: number;
      name: string;
      nameKo: string;
      nameLatin?: string;
      nameJaKana?: string;
      nameJaKanji?: string;
      aliases: Array<{
        alias: string;
        locale: string;
        kind: string;
        source: string;
      }>;
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
  aliases: Array<{
    alias: string;
    locale: string;
    kind: string;
    source: string;
  }>;
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
  q_song_ko_a2?: string[];
  q_song_ko_f?: string[];

  q_song_latin_p?: string[];
  q_song_latin_a?: string[];
  q_song_latin_a2?: string[];
  q_song_latin_f?: string[];

  q_song_ja_kanji_p?: string[];
  q_song_ja_kanji_a?: string[];
  q_song_ja_kanji_a2?: string[];
  q_song_ja_kanji_f?: string[];

  q_song_ja_kana_p?: string[];
  q_song_ja_kana_a?: string[];
  q_song_ja_kana_a2?: string[];
  q_song_ja_kana_f?: string[];
  q_song_ko_norm?: string[];
  q_song_latin_norm?: string[];
  q_song_ja_kanji_norm?: string[];
  q_song_ja_kana_norm?: string[];

  q_artist_ko_p?: string[];
  q_artist_ko_a?: string[];
  q_artist_ko_a2?: string[];
  q_artist_ko_f?: string[];

  q_artist_raw_p?: string[];
  q_artist_raw_a?: string[];
  q_artist_raw_a2?: string[];
  q_artist_raw_f?: string[];

  q_artist_ko_norm?: string[];
  q_artist_raw_norm?: string[];
  q_artist_ja_kanji_norm?: string[];
  q_artist_ja_kana_norm?: string[];

  q_artist_ja_kanji_p?: string[];
  q_artist_ja_kanji_a?: string[];
  q_artist_ja_kanji_a2?: string[];
  q_artist_ja_kanji_f?: string[];

  q_artist_ja_kana_p?: string[];
  q_artist_ja_kana_a?: string[];
  q_artist_ja_kana_a2?: string[];
  q_artist_ja_kana_f?: string[];

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
  q_name_ko_a2?: string[];
  q_name_ko_f?: string[];
  q_name_ko_norm?: string[];

  q_name_latin_p?: string[];
  q_name_latin_a?: string[];
  q_name_latin_a2?: string[];
  q_name_latin_f?: string[];
  q_name_latin_norm?: string[];

  q_name_ja_kanji_p?: string[];
  q_name_ja_kanji_a?: string[];
  q_name_ja_kanji_a2?: string[];
  q_name_ja_kanji_f?: string[];
  q_name_ja_kanji_norm?: string[];

  q_name_ja_kana_p?: string[];
  q_name_ja_kana_a?: string[];
  q_name_ja_kana_a2?: string[];
  q_name_ja_kana_f?: string[];
  q_name_ja_kana_norm?: string[];
}

/**
 * 별칭을 locale/kind/source에 따라 q_* 필드로 그룹화
 */
function groupAliases(
  aliases: Array<{
    alias: string;
    locale: string;
    kind: string;
    source: string;
  }>,
  prefix: "q_song" | "q_artist" | "q_name",
) {
  const result: Record<string, string[]> = {};

  for (const { alias, locale, kind, source } of aliases) {
    // locale 변환: KO, JA_KANA, JA_KANJI, LATIN
    let localeKey: string;
    if (locale === "KO") {
      localeKey = "ko";
    } else if (locale === "JA_KANA") {
      localeKey = "ja_kana";
    } else if (locale === "JA_KANJI") {
      localeKey = "ja_kanji";
    } else if (locale === "LATIN") {
      localeKey =
        prefix === "q_artist" || prefix === "q_name" ? "latin" : "latin";
      // q_artist는 songs 컬렉션의 아티스트 필드용 (raw 사용)
      // q_name은 artists 컬렉션의 이름 필드용 (latin 사용)
      if (prefix === "q_artist") {
        localeKey = "raw";
      }
    } else {
      continue; // 알 수 없는 locale은 스킵
    }

    // tier 결정: P(Primary), A(Alias), A2(AI), F(Fuzzy)
    let tier: string;
    if (kind === "SPOTIFY" || kind === "COMMON_NAME") {
      tier = "p";
    } else if (
      kind === "YOUTUBE" ||
      kind === "ROMANIZATION" ||
      kind === "TRANSLATION" ||
      kind === "TJ_NAME" ||
      kind === "NICKNAME"
    ) {
      if (source === "AI") {
        tier = "a2";
      } else {
        tier = "a";
      }
    } else {
      tier = "a"; // 기본값
    }

    const fieldName = `${prefix}_${localeKey}_${tier}`;
    if (!result[fieldName]) {
      result[fieldName] = [];
    }
    result[fieldName].push(alias);
  }

  return result;
}

/**
 * 공백 제거 (combo 필드용)
 */
function removeSpaces(text: string): string {
  return text.replace(/\s+/g, "");
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

function normalizeBasic(text?: string) {
  if (!text) {
    return undefined;
  }

  const normalized = cleanText(removeSpaces(text));
  return normalized.length > 0 ? normalized : undefined;
}

function transferNormalizedValues(
  source: Set<string>,
  target: Set<string>,
) {
  for (const value of Array.from(source)) {
    const normalized = normalizeBasic(value);
    if (!normalized) {
      continue;
    }
    target.add(normalized);
    if (normalized === value) {
      source.delete(value);
    }
  }
}

function buildPrimaryValues(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = cleanText(value);
  return cleaned === value ? [value] : [value, cleaned];
}

/**
 * DB Song → Typesense Document 변환
 */
export function transformSongToDocument(
  song: SongWithRelations,
): TypesenseSongDocument {
  const artists = song.artistSongs.map((as) => as.artist);
  const mainArtist = artists[0]; // 첫 번째 아티스트를 메인으로 간주

  // 곡 별칭 그룹화
  const songAliases = groupAliases(song.aliases, "q_song");

  // 아티스트 별칭 그룹화 (모든 아티스트의 별칭 합침)
  const allArtistAliases = artists.flatMap((artist) => artist.aliases);
  const artistAliases = groupAliases(allArtistAliases, "q_artist");

  // Song 테이블의 제목 (primary 검색 필드로 사용)
  const titleKo = song.titleKo;
  const titleJaKanji = song.titleJaKanji;
  const titleJaKana = song.titleJaKana;
  const titleLatin = song.titleLatin;

  // TJ 곡 ID
  const tjSongId = song.tjSongId ?? song.tjSong?.id ?? undefined;

  // 인기도
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

  // Combo 필드 (곡+아티스트 조합, 공백 제거)
  const q_combo_a: string[] = [];
  const songKoNoSpace = titleKo ? removeSpaces(titleKo) : null;
  const artistKoNoSpace = mainArtist?.nameKo
    ? removeSpaces(mainArtist.nameKo)
    : null;

  if (songKoNoSpace && artistKoNoSpace) {
    q_combo_a.push(`${songKoNoSpace}${artistKoNoSpace}`);
  }

  // romanization 조합 (예: "요루니카케루요아소비")
  const songKoRoman = song.aliases.find(
    (a) => a.locale === "KO" && a.kind === "ROMANIZATION",
  )?.alias;
  if (songKoRoman && artistKoNoSpace) {
    const romanNoSpace = removeSpaces(songKoRoman);
    q_combo_a.push(`${romanNoSpace}${artistKoNoSpace}`);
  }

  // Song 테이블의 제목만 q_song_*_p 필드에 추가 (원본 + 괄호/구두점 제거 버전)
  const q_song_ko_p = buildPrimaryValues(titleKo);
  const q_song_ja_kanji_p = buildPrimaryValues(titleJaKanji);
  const q_song_ja_kana_p = buildPrimaryValues(titleJaKana);
  const q_song_latin_p = buildPrimaryValues(titleLatin);

  // 곡 제목의 정규화 버전을 _a 필드에 추가
  const q_song_ko_a_values = new Set<string>(songAliases.q_song_ko_a || []);
  const q_song_latin_a_values = new Set<string>(
    songAliases.q_song_latin_a || [],
  );
  const q_song_ja_kanji_a_values = new Set<string>(
    songAliases.q_song_ja_kanji_a || [],
  );
  const q_song_ja_kana_a_values = new Set<string>(
    songAliases.q_song_ja_kana_a || [],
  );
  const q_song_ko_norm_values = new Set<string>();
  const q_song_latin_norm_values = new Set<string>();
  const q_song_ja_kanji_norm_values = new Set<string>();
  const q_song_ja_kana_norm_values = new Set<string>();

  transferNormalizedValues(q_song_ko_a_values, q_song_ko_norm_values);
  transferNormalizedValues(q_song_latin_a_values, q_song_latin_norm_values);
  transferNormalizedValues(q_song_ja_kanji_a_values, q_song_ja_kanji_norm_values);
  transferNormalizedValues(q_song_ja_kana_a_values, q_song_ja_kana_norm_values);

  const normalizedSongKo = normalizeBasic(titleKo);
  if (normalizedSongKo) {
    q_song_ko_norm_values.add(normalizedSongKo);
  }

  const normalizedSongLatin = normalizeBasic(titleLatin);
  if (normalizedSongLatin) {
    q_song_latin_norm_values.add(normalizedSongLatin);
  }

  const normalizedSongJaKanji = normalizeBasic(titleJaKanji);
  if (normalizedSongJaKanji) {
    q_song_ja_kanji_norm_values.add(normalizedSongJaKanji);
  }

  const normalizedSongJaKana = normalizeBasic(titleJaKana);
  if (normalizedSongJaKana) {
    q_song_ja_kana_norm_values.add(normalizedSongJaKana);
  }

  addJapaneseVariants(q_song_ja_kanji_a_values, titleJaKanji, {
    includeNormalized: false,
  });
  addJapaneseVariants(q_song_ja_kana_a_values, titleJaKana, {
    includeNormalized: false,
  });

  const q_song_ko_a =
    q_song_ko_a_values.size > 0 ? Array.from(q_song_ko_a_values) : undefined;
  const q_song_latin_a =
    q_song_latin_a_values.size > 0
      ? Array.from(q_song_latin_a_values)
      : undefined;
  const q_song_ja_kanji_a =
    q_song_ja_kanji_a_values.size > 0
      ? Array.from(q_song_ja_kanji_a_values)
      : undefined;
  const q_song_ja_kana_a =
    q_song_ja_kana_a_values.size > 0
      ? Array.from(q_song_ja_kana_a_values)
      : undefined;
  const q_song_ko_norm =
    q_song_ko_norm_values.size > 0
      ? Array.from(q_song_ko_norm_values)
      : undefined;
  const q_song_latin_norm =
    q_song_latin_norm_values.size > 0
      ? Array.from(q_song_latin_norm_values)
      : undefined;
  const q_song_ja_kanji_norm =
    q_song_ja_kanji_norm_values.size > 0
      ? Array.from(q_song_ja_kanji_norm_values)
      : undefined;
  const q_song_ja_kana_norm =
    q_song_ja_kana_norm_values.size > 0
      ? Array.from(q_song_ja_kana_norm_values)
      : undefined;

  // Artist 테이블의 컬럼만 q_artist_*_p 필드에 추가 (원본 + 괄호 제거 버전)
  const q_artist_ko_p_values: string[] = [];
  const q_artist_raw_p_values: string[] = [];
  const q_artist_ja_kanji_p_values: string[] = [];
  const q_artist_ja_kana_p_values: string[] = [];

  for (const artist of artists) {
    // nameKo: 원본 + 괄호/구두점 제거
    if (artist.nameKo) {
      if (!q_artist_ko_p_values.includes(artist.nameKo)) {
        q_artist_ko_p_values.push(artist.nameKo);
      }
      const cleaned = cleanText(artist.nameKo);
      if (
        artist.nameKo !== cleaned &&
        !q_artist_ko_p_values.includes(cleaned)
      ) {
        q_artist_ko_p_values.push(cleaned);
      }
    }

    // nameLatin: 원본 + 괄호/구두점 제거
    if (artist.nameLatin) {
      if (!q_artist_raw_p_values.includes(artist.nameLatin)) {
        q_artist_raw_p_values.push(artist.nameLatin);
      }
      const cleaned = cleanText(artist.nameLatin);
      if (
        artist.nameLatin !== cleaned &&
        !q_artist_raw_p_values.includes(cleaned)
      ) {
        q_artist_raw_p_values.push(cleaned);
      }
    }

    // nameJaKanji: 원본 + 괄호/구두점 제거
    if (artist.nameJaKanji) {
      if (!q_artist_ja_kanji_p_values.includes(artist.nameJaKanji)) {
        q_artist_ja_kanji_p_values.push(artist.nameJaKanji);
      }
      const cleaned = cleanText(artist.nameJaKanji);
      if (
        artist.nameJaKanji !== cleaned &&
        !q_artist_ja_kanji_p_values.includes(cleaned)
      ) {
        q_artist_ja_kanji_p_values.push(cleaned);
      }
    }

    // nameJaKana: 원본 + 괄호/구두점 제거
    if (artist.nameJaKana) {
      if (!q_artist_ja_kana_p_values.includes(artist.nameJaKana)) {
        q_artist_ja_kana_p_values.push(artist.nameJaKana);
      }
      const cleaned = cleanText(artist.nameJaKana);
      if (
        artist.nameJaKana !== cleaned &&
        !q_artist_ja_kana_p_values.includes(cleaned)
      ) {
        q_artist_ja_kana_p_values.push(cleaned);
      }
    }
  }

  const q_artist_ko_p =
    q_artist_ko_p_values.length > 0 ? q_artist_ko_p_values : undefined;
  const q_artist_raw_p =
    q_artist_raw_p_values.length > 0 ? q_artist_raw_p_values : undefined;
  const q_artist_ja_kanji_p =
    q_artist_ja_kanji_p_values.length > 0
      ? q_artist_ja_kanji_p_values
      : undefined;
  const q_artist_ja_kana_p =
    q_artist_ja_kana_p_values.length > 0
      ? q_artist_ja_kana_p_values
      : undefined;

  // 아티스트 정규화 버전을 _a 필드에 추가
  const q_artist_ko_a_values = new Set<string>(
    artistAliases.q_artist_ko_a || [],
  );
  const q_artist_ko_norm_values = new Set<string>();
  const q_artist_raw_norm_values = new Set<string>();
  const q_artist_raw_a_values = new Set<string>(
    artistAliases.q_artist_raw_a || [],
  );
  const q_artist_ja_kanji_a_values = new Set<string>(
    artistAliases.q_artist_ja_kanji_a || [],
  );
  const q_artist_ja_kana_a_values = new Set<string>(
    artistAliases.q_artist_ja_kana_a || [],
  );
  const q_artist_ja_kanji_norm_values = new Set<string>();
  const q_artist_ja_kana_norm_values = new Set<string>();

  transferNormalizedValues(q_artist_ko_a_values, q_artist_ko_norm_values);
  transferNormalizedValues(q_artist_raw_a_values, q_artist_raw_norm_values);
  transferNormalizedValues(q_artist_ja_kanji_a_values, q_artist_ja_kanji_norm_values);
  transferNormalizedValues(q_artist_ja_kana_a_values, q_artist_ja_kana_norm_values);

  for (const artist of artists) {
    // q_artist_ko_norm: 공백+특수문자 제거 버전은 별도 필드에 저장
    const normalizedKo = normalizeBasic(artist.nameKo);
    if (normalizedKo) {
      q_artist_ko_norm_values.add(normalizedKo);
    }

    const normalizedRaw = normalizeBasic(artist.nameLatin);
    if (normalizedRaw) {
      q_artist_raw_norm_values.add(normalizedRaw);
    }

    const normalizedJaKanji = normalizeBasic(artist.nameJaKanji);
    if (normalizedJaKanji) {
      q_artist_ja_kanji_norm_values.add(normalizedJaKanji);
    }

    const normalizedJaKana = normalizeBasic(artist.nameJaKana);
    if (normalizedJaKana) {
      q_artist_ja_kana_norm_values.add(normalizedJaKana);
    }

    addJapaneseVariants(q_artist_ja_kanji_a_values, artist.nameJaKanji, {
      includeNormalized: false,
    });
    addJapaneseVariants(q_artist_ja_kana_a_values, artist.nameJaKana, {
      includeNormalized: false,
    });
  }

  const q_artist_ko_a =
    q_artist_ko_a_values.size > 0
      ? Array.from(q_artist_ko_a_values)
      : undefined;
  const q_artist_raw_a =
    q_artist_raw_a_values.size > 0
      ? Array.from(q_artist_raw_a_values)
      : undefined;
  const q_artist_ko_norm =
    q_artist_ko_norm_values.size > 0
      ? Array.from(q_artist_ko_norm_values)
      : undefined;
  const q_artist_raw_norm =
    q_artist_raw_norm_values.size > 0
      ? Array.from(q_artist_raw_norm_values)
      : undefined;
  const q_artist_ja_kanji_norm =
    q_artist_ja_kanji_norm_values.size > 0
      ? Array.from(q_artist_ja_kanji_norm_values)
      : undefined;
  const q_artist_ja_kana_norm =
    q_artist_ja_kana_norm_values.size > 0
      ? Array.from(q_artist_ja_kana_norm_values)
      : undefined;
  const q_artist_ja_kanji_a =
    q_artist_ja_kanji_a_values.size > 0
      ? Array.from(q_artist_ja_kanji_a_values)
      : undefined;
  const q_artist_ja_kana_a =
    q_artist_ja_kana_a_values.size > 0
      ? Array.from(q_artist_ja_kana_a_values)
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

    // 곡 별칭 필드
    q_song_ko_p,
    q_song_ko_a,
    q_song_ko_a2: songAliases.q_song_ko_a2,
    q_song_ko_f: songAliases.q_song_ko_f,
    q_song_ko_norm,

    q_song_latin_p,
    q_song_latin_a,
    q_song_latin_a2: songAliases.q_song_latin_a2,
    q_song_latin_f: songAliases.q_song_latin_f,
    q_song_latin_norm,

    q_song_ja_kanji_p,
    q_song_ja_kanji_a,
    q_song_ja_kanji_a2: songAliases.q_song_ja_kanji_a2,
    q_song_ja_kanji_f: songAliases.q_song_ja_kanji_f,
    q_song_ja_kanji_norm,

    q_song_ja_kana_p,
    q_song_ja_kana_a,
    q_song_ja_kana_a2: songAliases.q_song_ja_kana_a2,
    q_song_ja_kana_f: songAliases.q_song_ja_kana_f,
    q_song_ja_kana_norm,

    // 아티스트 별칭 필드
    q_artist_ko_p,
    q_artist_ko_a,
    q_artist_ko_a2: artistAliases.q_artist_ko_a2,
    q_artist_ko_f: artistAliases.q_artist_ko_f,

    q_artist_raw_p,
    q_artist_raw_a,
    q_artist_raw_a2: artistAliases.q_artist_raw_a2,
    q_artist_raw_f: artistAliases.q_artist_raw_f,

    q_artist_ko_norm,
    q_artist_raw_norm,
    q_artist_ja_kanji_norm,
    q_artist_ja_kana_norm,

    q_artist_ja_kanji_p,
    q_artist_ja_kanji_a,
    q_artist_ja_kanji_a2: artistAliases.q_artist_ja_kanji_a2,
    q_artist_ja_kanji_f: artistAliases.q_artist_ja_kanji_f,

    q_artist_ja_kana_p,
    q_artist_ja_kana_a,
    q_artist_ja_kana_a2: artistAliases.q_artist_ja_kana_a2,
    q_artist_ja_kana_f: artistAliases.q_artist_ja_kana_f,

    // Combo 필드
    q_combo_a: q_combo_a.length > 0 ? q_combo_a : undefined,
  };
}

/**
 * DB Artist → Typesense Artist Document 변환
 */
export function transformArtistToDocument(
  artist: ArtistWithRelations,
): TypesenseArtistDocument {
  // 별칭 그룹화
  const nameAliases = groupAliases(artist.aliases, "q_name");

  // Artist 테이블의 이름 (primary 검색 필드로 사용)
  const nameKo = artist.nameKo;
  const nameLatin = artist.nameLatin;
  const nameJaKanji = artist.nameJaKanji;
  const nameJaKana = artist.nameJaKana;

  // TJ 곡 개수 계산: 해당 아티스트의 곡 중 TJ 노래방 번호가 있는 곡의 개수
  const artistSongs = artist.artistSongs ?? [];
  const tjSongCount = artistSongs.reduce((count, artistSong) => {
    return artistSong.song?.tjSong ? count + 1 : count;
  }, 0);

  // 인기도: spotifyPopularity + tjSongCount
  const spotifyPopularity = artist.spotifyArtist?.popularity ?? undefined;
  const hasPopularitySource =
    spotifyPopularity !== undefined || tjSongCount > 0;
  const popularity = hasPopularitySource
    ? calculateArtistPopularity(spotifyPopularity, tjSongCount)
    : undefined;

  // Artist 테이블의 컬럼만 q_name_*_p 필드에 추가 (원본 + 괄호/구두점 제거 버전)
  const q_name_ko_p = buildPrimaryValues(nameKo);
  const q_name_latin_p = buildPrimaryValues(nameLatin);
  const q_name_ja_kanji_p = buildPrimaryValues(nameJaKanji);
  const q_name_ja_kana_p = buildPrimaryValues(nameJaKana);

  // 아티스트 이름의 정규화 버전을 _a 필드에 추가
  const q_name_ko_a_values = new Set<string>(nameAliases.q_name_ko_a || []);
  const q_name_latin_a_values = new Set<string>(
    nameAliases.q_name_latin_a || [],
  );
  const q_name_ja_kanji_a_values = new Set<string>(
    nameAliases.q_name_ja_kanji_a || [],
  );
  const q_name_ja_kana_a_values = new Set<string>(
    nameAliases.q_name_ja_kana_a || [],
  );
  if (nameKo) {
    const cleanedKo = cleanText(nameKo);
    if (cleanedKo && cleanedKo !== nameKo) {
      q_name_ko_a_values.add(cleanedKo);
    }
  }
  if (nameLatin) {
    const cleanedLatin = cleanText(nameLatin);
    if (cleanedLatin && cleanedLatin !== nameLatin) {
      q_name_latin_a_values.add(cleanedLatin);
    }
  }
  if (nameJaKanji) {
    const cleanedJaKanji = cleanText(nameJaKanji);
    if (cleanedJaKanji && cleanedJaKanji !== nameJaKanji) {
      q_name_ja_kanji_a_values.add(cleanedJaKanji);
    }
  }
  if (nameJaKana) {
    const cleanedJaKana = cleanText(nameJaKana);
    if (cleanedJaKana && cleanedJaKana !== nameJaKana) {
      q_name_ja_kana_a_values.add(cleanedJaKana);
    }
  }
  const q_name_ko_norm_values = new Set<string>();
  const q_name_latin_norm_values = new Set<string>();
  const q_name_ja_kanji_norm_values = new Set<string>();
  const q_name_ja_kana_norm_values = new Set<string>();
  for (const value of q_name_ko_a_values) {
    const normalized = normalizeBasic(value);
    if (normalized) {
      q_name_ko_norm_values.add(normalized);
    }
  }
  for (const value of q_name_latin_a_values) {
    const normalized = normalizeBasic(value);
    if (normalized) {
      q_name_latin_norm_values.add(normalized);
    }
  }
  for (const value of q_name_ja_kanji_a_values) {
    const normalized = normalizeBasic(value);
    if (normalized) {
      q_name_ja_kanji_norm_values.add(normalized);
    }
  }
  for (const value of q_name_ja_kana_a_values) {
    const normalized = normalizeBasic(value);
    if (normalized) {
      q_name_ja_kana_norm_values.add(normalized);
    }
  }

  const normalizedNameKo = normalizeBasic(nameKo);
  if (normalizedNameKo) {
    q_name_ko_norm_values.add(normalizedNameKo);
  }

  const normalizedNameLatin = normalizeBasic(nameLatin);
  if (normalizedNameLatin) {
    q_name_latin_norm_values.add(normalizedNameLatin);
  }

  const normalizedNameJaKanji = normalizeBasic(nameJaKanji);
  if (normalizedNameJaKanji) {
    q_name_ja_kanji_norm_values.add(normalizedNameJaKanji);
  }

  const normalizedNameJaKana = normalizeBasic(nameJaKana);
  if (normalizedNameJaKana) {
    q_name_ja_kana_norm_values.add(normalizedNameJaKana);
  }

  addJapaneseVariants(q_name_ja_kanji_a_values, nameJaKanji, {
    includeNormalized: false,
  });
  addJapaneseVariants(q_name_ja_kana_a_values, nameJaKana, {
    includeNormalized: false,
  });

  const q_name_ko_a =
    q_name_ko_a_values.size > 0 ? Array.from(q_name_ko_a_values) : undefined;
  const q_name_latin_a =
    q_name_latin_a_values.size > 0
      ? Array.from(q_name_latin_a_values)
      : undefined;
  const q_name_ja_kanji_a =
    q_name_ja_kanji_a_values.size > 0
      ? Array.from(q_name_ja_kanji_a_values)
      : undefined;
  const q_name_ja_kana_a =
    q_name_ja_kana_a_values.size > 0
      ? Array.from(q_name_ja_kana_a_values)
      : undefined;
  const q_name_ko_norm =
    q_name_ko_norm_values.size > 0
      ? Array.from(q_name_ko_norm_values)
      : undefined;
  const q_name_latin_norm =
    q_name_latin_norm_values.size > 0
      ? Array.from(q_name_latin_norm_values)
      : undefined;
  const q_name_ja_kanji_norm =
    q_name_ja_kanji_norm_values.size > 0
      ? Array.from(q_name_ja_kanji_norm_values)
      : undefined;
  const q_name_ja_kana_norm =
    q_name_ja_kana_norm_values.size > 0
      ? Array.from(q_name_ja_kana_norm_values)
      : undefined;

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

    // 이름 별칭 필드 (한국어)
    q_name_ko_p,
    q_name_ko_a,
    q_name_ko_a2: nameAliases.q_name_ko_a2,
    q_name_ko_f: nameAliases.q_name_ko_f,
    q_name_ko_norm,

    // 이름 별칭 필드 (라틴)
    q_name_latin_p,
    q_name_latin_a,
    q_name_latin_a2: nameAliases.q_name_latin_a2,
    q_name_latin_f: nameAliases.q_name_latin_f,
    q_name_latin_norm,

    // 이름 별칭 필드 (일본어 한자)
    q_name_ja_kanji_p,
    q_name_ja_kanji_a,
    q_name_ja_kanji_a2: nameAliases.q_name_ja_kanji_a2,
    q_name_ja_kanji_f: nameAliases.q_name_ja_kanji_f,
    q_name_ja_kanji_norm,

    // 이름 별칭 필드 (일본어 가나)
    q_name_ja_kana_p,
    q_name_ja_kana_a,
    q_name_ja_kana_a2: nameAliases.q_name_ja_kana_a2,
    q_name_ja_kana_f: nameAliases.q_name_ja_kana_f,
    q_name_ja_kana_norm,
  };
}
