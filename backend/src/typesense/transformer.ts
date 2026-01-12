import type { PrismaClient } from "@prisma/client";
import {
  cleanText,
  detectJapaneseType,
  hasMixedKana,
  katakanaToHiragana,
  removeBrackets,
  toAllHiragana,
  toAllKatakana,
} from "./lib/text-utils";

type SongWithRelations = Awaited<
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
      nameLatin?: string | null;
      nameJaKana?: string | null;
      nameJaKanji?: string | null;
      aliases: Array<{
        alias: string;
        locale: string;
        kind: string;
        source: string;
      }>;
      spotifyArtist?: {
        popularity: number | null;
      } | null;
    };
  }>;
  karaokeSongs: Array<{
    provider: string;
    karaokeNo: string;
  }>;
  spotifyTrack?: {
    spotifyTrack: {
      popularity: number | null;
    } | null;
  } | null;
  titleKo?: string | null;
  titleLatin?: string | null;
  titleJaKana?: string | null;
  titleJaKanji?: string | null;
};

type ArtistWithRelations = Awaited<
  ReturnType<PrismaClient["artist"]["findMany"]>
>[number] & {
  aliases: Array<{
    alias: string;
    locale: string;
    kind: string;
    source: string;
  }>;
  spotifyArtist?: {
    popularity: number | null;
  } | null;
  nameLatin?: string | null;
  nameJaKana?: string | null;
  nameJaKanji?: string | null;
};

export interface TypesenseSongDocument {
  id: string;
  catalog?: string;

  titleKo?: string;
  titleJaKanji?: string;
  titleJaKana?: string;
  titleLatin?: string;

  artistIds: string[];

  karaokeNosTj?: string[];
  karaokeNosKy?: string[];

  popularity?: number;
  artistPopularity?: number;
  hasKaraokeNo?: boolean;
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

  q_artist_ko_p?: string[];
  q_artist_ko_a?: string[];
  q_artist_ko_a2?: string[];
  q_artist_ko_f?: string[];

  q_artist_raw_p?: string[];
  q_artist_raw_a?: string[];
  q_artist_raw_a2?: string[];
  q_artist_raw_f?: string[];

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
  updatedAt: number;

  q_name_ko_p?: string[];
  q_name_ko_a?: string[];
  q_name_ko_a2?: string[];
  q_name_ko_f?: string[];

  q_name_latin_p?: string[];
  q_name_latin_a?: string[];
  q_name_latin_a2?: string[];
  q_name_latin_f?: string[];

  q_name_ja_kanji_p?: string[];
  q_name_ja_kanji_a?: string[];
  q_name_ja_kanji_a2?: string[];
  q_name_ja_kanji_f?: string[];

  q_name_ja_kana_p?: string[];
  q_name_ja_kana_a?: string[];
  q_name_ja_kana_a2?: string[];
  q_name_ja_kana_f?: string[];
}

// Backward compatibility
export type TypesenseDocument = TypesenseSongDocument;

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

/**
 * DB Song → Typesense Document 변환
 */
export function transformSongToDocument(
  song: SongWithRelations,
): TypesenseDocument {
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

  // 노래방 번호
  const karaokeNosTj = song.karaokeSongs
    .filter((ks) => ks.provider === "TJ")
    .map((ks) => ks.karaokeNo);
  const karaokeNosKy = song.karaokeSongs
    .filter((ks) => ks.provider === "KY")
    .map((ks) => ks.karaokeNo);

  // 인기도
  const popularity = song.spotifyTrack?.spotifyTrack?.popularity ?? undefined;
  const artistPopularity = mainArtist?.spotifyArtist?.popularity ?? undefined;

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
  const q_song_ko_p = titleKo
    ? titleKo === cleanText(titleKo)
      ? [titleKo]
      : [titleKo, cleanText(titleKo)]
    : undefined;

  const q_song_ja_kanji_p = titleJaKanji
    ? titleJaKanji === cleanText(titleJaKanji)
      ? [titleJaKanji]
      : [titleJaKanji, cleanText(titleJaKanji)]
    : undefined;

  const q_song_ja_kana_p = titleJaKana
    ? titleJaKana === cleanText(titleJaKana)
      ? [titleJaKana]
      : [titleJaKana, cleanText(titleJaKana)]
    : undefined;

  const q_song_latin_p = titleLatin
    ? titleLatin === cleanText(titleLatin)
      ? [titleLatin]
      : [titleLatin, cleanText(titleLatin)]
    : undefined;

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

  // q_song_ko_a: 공백+특수문자 제거만
  if (titleKo) {
    const noSpaceAndPunct = cleanText(removeSpaces(titleKo));
    if (noSpaceAndPunct !== titleKo) {
      q_song_ko_a_values.add(noSpaceAndPunct);
    }
  }

  // q_song_latin_a: 공백+특수문자 제거만
  if (titleLatin) {
    const noSpaceAndPunct = cleanText(removeSpaces(titleLatin));
    if (noSpaceAndPunct !== titleLatin) {
      q_song_latin_a_values.add(noSpaceAndPunct);
    }
  }

  // q_song_ja_kanji_a: 공백+특수 제거 / 히라 / 가타 / 공백특수히라 / 공백특수가타
  if (titleJaKanji) {
    // 1. 공백+특수문자 제거
    const noSpaceAndPunct = cleanText(removeSpaces(titleJaKanji));
    if (noSpaceAndPunct !== titleJaKanji) {
      q_song_ja_kanji_a_values.add(noSpaceAndPunct);
    }

    // 2. 히라가나 변환 (원본 기준)
    const hiragana = toAllHiragana(titleJaKanji);
    if (hiragana !== titleJaKanji) {
      q_song_ja_kanji_a_values.add(hiragana);
    }

    // 3. 카타카나 변환 (원본 기준)
    const katakana = toAllKatakana(titleJaKanji);
    if (katakana !== titleJaKanji) {
      q_song_ja_kanji_a_values.add(katakana);
    }

    // 4. 공백+특수문자 제거 + 히라가나
    const noSpaceAndPunctHiragana = toAllHiragana(noSpaceAndPunct);
    if (
      noSpaceAndPunctHiragana !== noSpaceAndPunct &&
      noSpaceAndPunctHiragana !== hiragana
    ) {
      q_song_ja_kanji_a_values.add(noSpaceAndPunctHiragana);
    }

    // 5. 공백+특수문자 제거 + 카타카나
    const noSpaceAndPunctKatakana = toAllKatakana(noSpaceAndPunct);
    if (
      noSpaceAndPunctKatakana !== noSpaceAndPunct &&
      noSpaceAndPunctKatakana !== katakana
    ) {
      q_song_ja_kanji_a_values.add(noSpaceAndPunctKatakana);
    }
  }

  // q_song_ja_kana_a: 공백+특수 제거 / 히라 / 가타 / 공백특수히라 / 공백특수가타
  if (titleJaKana) {
    // 1. 공백+특수문자 제거
    const noSpaceAndPunct = cleanText(removeSpaces(titleJaKana));
    if (noSpaceAndPunct !== titleJaKana) {
      q_song_ja_kana_a_values.add(noSpaceAndPunct);
    }

    // 2. 히라가나 변환 (원본 기준)
    const hiragana = toAllHiragana(titleJaKana);
    if (hiragana !== titleJaKana) {
      q_song_ja_kana_a_values.add(hiragana);
    }

    // 3. 카타카나 변환 (원본 기준)
    const katakana = toAllKatakana(titleJaKana);
    if (katakana !== titleJaKana) {
      q_song_ja_kana_a_values.add(katakana);
    }

    // 4. 공백+특수문자 제거 + 히라가나
    const noSpaceAndPunctHiragana = toAllHiragana(noSpaceAndPunct);
    if (
      noSpaceAndPunctHiragana !== noSpaceAndPunct &&
      noSpaceAndPunctHiragana !== hiragana
    ) {
      q_song_ja_kana_a_values.add(noSpaceAndPunctHiragana);
    }

    // 5. 공백+특수문자 제거 + 카타카나
    const noSpaceAndPunctKatakana = toAllKatakana(noSpaceAndPunct);
    if (
      noSpaceAndPunctKatakana !== noSpaceAndPunct &&
      noSpaceAndPunctKatakana !== katakana
    ) {
      q_song_ja_kana_a_values.add(noSpaceAndPunctKatakana);
    }
  }

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
  const q_artist_raw_a_values = new Set<string>(
    artistAliases.q_artist_raw_a || [],
  );
  const q_artist_ja_kanji_a_values = new Set<string>(
    artistAliases.q_artist_ja_kanji_a || [],
  );
  const q_artist_ja_kana_a_values = new Set<string>(
    artistAliases.q_artist_ja_kana_a || [],
  );

  for (const artist of artists) {
    // q_artist_ko_a: 공백+특수문자 제거만
    if (artist.nameKo) {
      const noSpaceAndPunct = cleanText(removeSpaces(artist.nameKo));
      if (noSpaceAndPunct !== artist.nameKo) {
        q_artist_ko_a_values.add(noSpaceAndPunct);
      }
    }

    // q_artist_raw_a: 공백+특수문자 제거만
    if (artist.nameLatin) {
      const noSpaceAndPunct = cleanText(removeSpaces(artist.nameLatin));
      if (noSpaceAndPunct !== artist.nameLatin) {
        q_artist_raw_a_values.add(noSpaceAndPunct);
      }
    }

    // q_artist_ja_kanji_a: 공백+특수 제거 / 히라 / 가타 / 공백특수히라 / 공백특수가타
    if (artist.nameJaKanji) {
      const noSpaceAndPunct = cleanText(removeSpaces(artist.nameJaKanji));
      if (noSpaceAndPunct !== artist.nameJaKanji) {
        q_artist_ja_kanji_a_values.add(noSpaceAndPunct);
      }

      const hiragana = toAllHiragana(artist.nameJaKanji);
      if (hiragana !== artist.nameJaKanji) {
        q_artist_ja_kanji_a_values.add(hiragana);
      }

      const katakana = toAllKatakana(artist.nameJaKanji);
      if (katakana !== artist.nameJaKanji) {
        q_artist_ja_kanji_a_values.add(katakana);
      }

      const noSpaceAndPunctHiragana = toAllHiragana(noSpaceAndPunct);
      if (
        noSpaceAndPunctHiragana !== noSpaceAndPunct &&
        noSpaceAndPunctHiragana !== hiragana
      ) {
        q_artist_ja_kanji_a_values.add(noSpaceAndPunctHiragana);
      }

      const noSpaceAndPunctKatakana = toAllKatakana(noSpaceAndPunct);
      if (
        noSpaceAndPunctKatakana !== noSpaceAndPunct &&
        noSpaceAndPunctKatakana !== katakana
      ) {
        q_artist_ja_kanji_a_values.add(noSpaceAndPunctKatakana);
      }
    }

    // q_artist_ja_kana_a: 공백+특수 제거 / 히라 / 가타 / 공백특수히라 / 공백특수가타
    if (artist.nameJaKana) {
      const noSpaceAndPunct = cleanText(removeSpaces(artist.nameJaKana));
      if (noSpaceAndPunct !== artist.nameJaKana) {
        q_artist_ja_kana_a_values.add(noSpaceAndPunct);
      }

      const hiragana = toAllHiragana(artist.nameJaKana);
      if (hiragana !== artist.nameJaKana) {
        q_artist_ja_kana_a_values.add(hiragana);
      }

      const katakana = toAllKatakana(artist.nameJaKana);
      if (katakana !== artist.nameJaKana) {
        q_artist_ja_kana_a_values.add(katakana);
      }

      const noSpaceAndPunctHiragana = toAllHiragana(noSpaceAndPunct);
      if (
        noSpaceAndPunctHiragana !== noSpaceAndPunct &&
        noSpaceAndPunctHiragana !== hiragana
      ) {
        q_artist_ja_kana_a_values.add(noSpaceAndPunctHiragana);
      }

      const noSpaceAndPunctKatakana = toAllKatakana(noSpaceAndPunct);
      if (
        noSpaceAndPunctKatakana !== noSpaceAndPunct &&
        noSpaceAndPunctKatakana !== katakana
      ) {
        q_artist_ja_kana_a_values.add(noSpaceAndPunctKatakana);
      }
    }
  }

  const q_artist_ko_a =
    q_artist_ko_a_values.size > 0
      ? Array.from(q_artist_ko_a_values)
      : undefined;
  const q_artist_raw_a =
    q_artist_raw_a_values.size > 0
      ? Array.from(q_artist_raw_a_values)
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

    karaokeNosTj: karaokeNosTj.length > 0 ? karaokeNosTj : undefined,
    karaokeNosKy: karaokeNosKy.length > 0 ? karaokeNosKy : undefined,

    popularity,
    artistPopularity,
    hasKaraokeNo:
      karaokeNosTj.length > 0 || karaokeNosKy.length > 0 || undefined,
    updatedAt: Math.floor(song.updatedAt.getTime() / 1000),

    // 곡 별칭 필드
    q_song_ko_p,
    q_song_ko_a,
    q_song_ko_a2: songAliases.q_song_ko_a2,
    q_song_ko_f: songAliases.q_song_ko_f,

    q_song_latin_p,
    q_song_latin_a,
    q_song_latin_a2: songAliases.q_song_latin_a2,
    q_song_latin_f: songAliases.q_song_latin_f,

    q_song_ja_kanji_p,
    q_song_ja_kanji_a,
    q_song_ja_kanji_a2: songAliases.q_song_ja_kanji_a2,
    q_song_ja_kanji_f: songAliases.q_song_ja_kanji_f,

    q_song_ja_kana_p,
    q_song_ja_kana_a,
    q_song_ja_kana_a2: songAliases.q_song_ja_kana_a2,
    q_song_ja_kana_f: songAliases.q_song_ja_kana_f,

    // 아티스트 별칭 필드
    q_artist_ko_p,
    q_artist_ko_a,
    q_artist_ko_a2: artistAliases.q_artist_ko_a2,
    q_artist_ko_f: artistAliases.q_artist_ko_f,

    q_artist_raw_p,
    q_artist_raw_a,
    q_artist_raw_a2: artistAliases.q_artist_raw_a2,
    q_artist_raw_f: artistAliases.q_artist_raw_f,

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

  // 인기도
  const popularity = artist.spotifyArtist?.popularity ?? undefined;

  // Artist 테이블의 컬럼만 q_name_*_p 필드에 추가 (원본 + 괄호/구두점 제거 버전)
  const q_name_ko_p = nameKo
    ? nameKo === cleanText(nameKo)
      ? [nameKo]
      : [nameKo, cleanText(nameKo)]
    : undefined;

  const q_name_latin_p = nameLatin
    ? nameLatin === cleanText(nameLatin)
      ? [nameLatin]
      : [nameLatin, cleanText(nameLatin)]
    : undefined;

  const q_name_ja_kanji_p = nameJaKanji
    ? nameJaKanji === cleanText(nameJaKanji)
      ? [nameJaKanji]
      : [nameJaKanji, cleanText(nameJaKanji)]
    : undefined;

  const q_name_ja_kana_p = nameJaKana
    ? nameJaKana === cleanText(nameJaKana)
      ? [nameJaKana]
      : [nameJaKana, cleanText(nameJaKana)]
    : undefined;

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

  // q_name_ko_a: 공백+특수문자 제거만
  if (nameKo) {
    const noSpaceAndPunct = cleanText(removeSpaces(nameKo));
    if (noSpaceAndPunct !== nameKo) {
      q_name_ko_a_values.add(noSpaceAndPunct);
    }
  }

  // q_name_latin_a: 공백+특수문자 제거만
  if (nameLatin) {
    const noSpaceAndPunct = cleanText(removeSpaces(nameLatin));
    if (noSpaceAndPunct !== nameLatin) {
      q_name_latin_a_values.add(noSpaceAndPunct);
    }
  }

  // q_name_ja_kanji_a: 공백+특수 제거 / 히라 / 가타 / 공백특수히라 / 공백특수가타
  if (nameJaKanji) {
    const noSpaceAndPunct = cleanText(removeSpaces(nameJaKanji));
    if (noSpaceAndPunct !== nameJaKanji) {
      q_name_ja_kanji_a_values.add(noSpaceAndPunct);
    }

    const hiragana = toAllHiragana(nameJaKanji);
    if (hiragana !== nameJaKanji) {
      q_name_ja_kanji_a_values.add(hiragana);
    }

    const katakana = toAllKatakana(nameJaKanji);
    if (katakana !== nameJaKanji) {
      q_name_ja_kanji_a_values.add(katakana);
    }

    const noSpaceAndPunctHiragana = toAllHiragana(noSpaceAndPunct);
    if (
      noSpaceAndPunctHiragana !== noSpaceAndPunct &&
      noSpaceAndPunctHiragana !== hiragana
    ) {
      q_name_ja_kanji_a_values.add(noSpaceAndPunctHiragana);
    }

    const noSpaceAndPunctKatakana = toAllKatakana(noSpaceAndPunct);
    if (
      noSpaceAndPunctKatakana !== noSpaceAndPunct &&
      noSpaceAndPunctKatakana !== katakana
    ) {
      q_name_ja_kanji_a_values.add(noSpaceAndPunctKatakana);
    }
  }

  // q_name_ja_kana_a: 공백+특수 제거 / 히라 / 가타 / 공백특수히라 / 공백특수가타
  if (nameJaKana) {
    const noSpaceAndPunct = cleanText(removeSpaces(nameJaKana));
    if (noSpaceAndPunct !== nameJaKana) {
      q_name_ja_kana_a_values.add(noSpaceAndPunct);
    }

    const hiragana = toAllHiragana(nameJaKana);
    if (hiragana !== nameJaKana) {
      q_name_ja_kana_a_values.add(hiragana);
    }

    const katakana = toAllKatakana(nameJaKana);
    if (katakana !== nameJaKana) {
      q_name_ja_kana_a_values.add(katakana);
    }

    const noSpaceAndPunctHiragana = toAllHiragana(noSpaceAndPunct);
    if (
      noSpaceAndPunctHiragana !== noSpaceAndPunct &&
      noSpaceAndPunctHiragana !== hiragana
    ) {
      q_name_ja_kana_a_values.add(noSpaceAndPunctHiragana);
    }

    const noSpaceAndPunctKatakana = toAllKatakana(noSpaceAndPunct);
    if (
      noSpaceAndPunctKatakana !== noSpaceAndPunct &&
      noSpaceAndPunctKatakana !== katakana
    ) {
      q_name_ja_kana_a_values.add(noSpaceAndPunctKatakana);
    }
  }

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

  return {
    id: artist.id.toString(),
    homeCatalog: artist.homeCatalog ?? undefined,

    nameKo: nameKo ?? undefined,
    nameJaKanji: nameJaKanji ?? undefined,
    nameJaKana: nameJaKana ?? undefined,
    nameLatin: nameLatin ?? undefined,

    popularity,
    updatedAt: Math.floor(artist.updatedAt.getTime() / 1000),

    // 이름 별칭 필드 (한국어)
    q_name_ko_p,
    q_name_ko_a,
    q_name_ko_a2: nameAliases.q_name_ko_a2,
    q_name_ko_f: nameAliases.q_name_ko_f,

    // 이름 별칭 필드 (라틴)
    q_name_latin_p,
    q_name_latin_a,
    q_name_latin_a2: nameAliases.q_name_latin_a2,
    q_name_latin_f: nameAliases.q_name_latin_f,

    // 이름 별칭 필드 (일본어 한자)
    q_name_ja_kanji_p,
    q_name_ja_kanji_a,
    q_name_ja_kanji_a2: nameAliases.q_name_ja_kanji_a2,
    q_name_ja_kanji_f: nameAliases.q_name_ja_kanji_f,

    // 이름 별칭 필드 (일본어 가나)
    q_name_ja_kana_p,
    q_name_ja_kana_a,
    q_name_ja_kana_a2: nameAliases.q_name_ja_kana_a2,
    q_name_ja_kana_f: nameAliases.q_name_ja_kana_f,
  };
}
