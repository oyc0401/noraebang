import type { PrismaClient } from "@prisma/client";

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
    popularity: number | null;
  } | null;
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
  aliases: Array<{ alias: string; locale: string; kind: string; source: string }>,
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
      localeKey = (prefix === "q_artist" || prefix === "q_name") ? "latin" : "latin";
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
    if (kind === "SPOTIFY") {
      tier = "p";
    } else if (kind === "YOUTUBE" || kind === "ROMANIZATION" || kind === "TRANSLATION" || kind === "TJ_NAME" || kind === "NICKNAME") {
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
 * 카타카나 → 히라가나 변환
 */
function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * 일본어 문자 타입 감지
 */
function detectJapaneseType(text: string): "kanji" | "kana" | "mixed" {
  const hasKanji = /[\u4e00-\u9faf]/.test(text);
  const hasKana = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);

  if (hasKanji) return "kanji";
  if (hasKana) return "kana";
  return "mixed";
}

/**
 * DB Song → Typesense Document 변환
 */
export function transformSongToDocument(song: SongWithRelations): TypesenseDocument {
  const artists = song.artistSongs.map((as) => as.artist);
  const mainArtist = artists[0]; // 첫 번째 아티스트를 메인으로 간주

  // 곡 별칭 그룹화
  const songAliases = groupAliases(song.aliases, "q_song");

  // 아티스트 별칭 그룹화 (모든 아티스트의 별칭 합침)
  const allArtistAliases = artists.flatMap((artist) => artist.aliases);
  const artistAliases = groupAliases(allArtistAliases, "q_artist");

  // 표시용 제목 (검색에는 사용 안 함)
  const titleKo = song.titleKo ?? song.aliases.find((a) => a.locale === "KO")?.alias;
  const titleJaKanji = song.title; // 원제는 보통 JA_KANJI
  const titleJaKana = song.aliases.find((a) => a.locale === "JA_KANA")?.alias;
  const titleLatin = song.aliases.find((a) => a.locale === "LATIN")?.alias;

  // 노래방 번호
  const karaokeNosTj = song.karaokeSongs.filter((ks) => ks.provider === "TJ").map((ks) => ks.karaokeNo);
  const karaokeNosKy = song.karaokeSongs.filter((ks) => ks.provider === "KY").map((ks) => ks.karaokeNo);

  // 인기도
  const popularity = song.spotifyTrack?.popularity ?? undefined;
  const artistPopularity = mainArtist?.spotifyArtist?.popularity ?? undefined;

  // Combo 필드 (곡+아티스트 조합, 공백 제거)
  const q_combo_a: string[] = [];
  const songKoNoSpace = titleKo ? removeSpaces(titleKo) : null;
  const artistKoNoSpace = mainArtist?.nameKo ? removeSpaces(mainArtist.nameKo) : null;

  if (songKoNoSpace && artistKoNoSpace) {
    q_combo_a.push(`${songKoNoSpace}${artistKoNoSpace}`);
  }

  // romanization 조합 (예: "요루니카케루요아소비")
  const songKoRoman = song.aliases.find((a) => a.locale === "KO" && a.kind === "ROMANIZATION")?.alias;
  if (songKoRoman && artistKoNoSpace) {
    const romanNoSpace = removeSpaces(songKoRoman);
    q_combo_a.push(`${romanNoSpace}${artistKoNoSpace}`);
  }

  // 기본 제목을 q_song_* 필드에 추가
  const q_song_ko_p = titleKo ? [titleKo, ...(songAliases.q_song_ko_p || [])] : songAliases.q_song_ko_p;
  const q_song_ja_kanji_p = titleJaKanji ? [titleJaKanji, ...(songAliases.q_song_ja_kanji_p || [])] : songAliases.q_song_ja_kanji_p;
  const q_song_ja_kana_p = titleJaKana ? [titleJaKana, ...(songAliases.q_song_ja_kana_p || [])] : songAliases.q_song_ja_kana_p;
  const q_song_latin_p = titleLatin ? [titleLatin, ...(songAliases.q_song_latin_p || [])] : songAliases.q_song_latin_p;

  // 아티스트 기본 이름을 q_artist_* 필드에 추가
  const artistBasicNames = artists.map((artist) => ({
    nameKo: artist.nameKo,
    name: artist.name,
  }));

  const q_artist_ko_p = artistBasicNames.some((a) => a.nameKo)
    ? [...artistBasicNames.filter((a) => a.nameKo).map((a) => a.nameKo!), ...(artistAliases.q_artist_ko_p || [])]
    : artistAliases.q_artist_ko_p;

  const q_artist_raw_p = artistBasicNames.some((a) => a.name)
    ? [...artistBasicNames.filter((a) => a.name).map((a) => a.name), ...(artistAliases.q_artist_raw_p || [])]
    : artistAliases.q_artist_raw_p;

  return {
    id: song.id.toString(),
    catalog: song.catalog ?? undefined,

    titleKo,
    titleJaKanji,
    titleJaKana,
    titleLatin,

    artistIds: artists.map((a) => a.id.toString()),

    karaokeNosTj: karaokeNosTj.length > 0 ? karaokeNosTj : undefined,
    karaokeNosKy: karaokeNosKy.length > 0 ? karaokeNosKy : undefined,

    popularity,
    artistPopularity,
    updatedAt: Math.floor(song.updatedAt.getTime() / 1000),

    // 곡 별칭 필드
    q_song_ko_p,
    q_song_ko_a: songAliases.q_song_ko_a,
    q_song_ko_a2: songAliases.q_song_ko_a2,
    q_song_ko_f: songAliases.q_song_ko_f,

    q_song_latin_p,
    q_song_latin_a: songAliases.q_song_latin_a,
    q_song_latin_a2: songAliases.q_song_latin_a2,
    q_song_latin_f: songAliases.q_song_latin_f,

    q_song_ja_kanji_p,
    q_song_ja_kanji_a: songAliases.q_song_ja_kanji_a,
    q_song_ja_kanji_a2: songAliases.q_song_ja_kanji_a2,
    q_song_ja_kanji_f: songAliases.q_song_ja_kanji_f,

    q_song_ja_kana_p,
    q_song_ja_kana_a: songAliases.q_song_ja_kana_a,
    q_song_ja_kana_a2: songAliases.q_song_ja_kana_a2,
    q_song_ja_kana_f: songAliases.q_song_ja_kana_f,

    // 아티스트 별칭 필드
    q_artist_ko_p,
    q_artist_ko_a: artistAliases.q_artist_ko_a,
    q_artist_ko_a2: artistAliases.q_artist_ko_a2,
    q_artist_ko_f: artistAliases.q_artist_ko_f,

    q_artist_raw_p,
    q_artist_raw_a: artistAliases.q_artist_raw_a,
    q_artist_raw_a2: artistAliases.q_artist_raw_a2,
    q_artist_raw_f: artistAliases.q_artist_raw_f,

    q_artist_ja_kanji_p: artistAliases.q_artist_ja_kanji_p,
    q_artist_ja_kanji_a: artistAliases.q_artist_ja_kanji_a,
    q_artist_ja_kanji_a2: artistAliases.q_artist_ja_kanji_a2,
    q_artist_ja_kanji_f: artistAliases.q_artist_ja_kanji_f,

    q_artist_ja_kana_p: artistAliases.q_artist_ja_kana_p,
    q_artist_ja_kana_a: artistAliases.q_artist_ja_kana_a,
    q_artist_ja_kana_a2: artistAliases.q_artist_ja_kana_a2,
    q_artist_ja_kana_f: artistAliases.q_artist_ja_kana_f,

    // Combo 필드
    q_combo_a: q_combo_a.length > 0 ? q_combo_a : undefined,
  };
}

/**
 * DB Artist → Typesense Artist Document 변환
 */
export function transformArtistToDocument(artist: ArtistWithRelations): TypesenseArtistDocument {
  // 별칭 그룹화
  const nameAliases = groupAliases(artist.aliases, "q_name");

  // 표시용 이름 (검색에는 사용 안 함)
  const nameKo = artist.nameKo ?? artist.aliases.find((a) => a.locale === "KO")?.alias;
  const nameLatin = artist.aliases.find((a) => a.locale === "LATIN")?.alias;

  // artist.name의 타입 감지
  const nameType = detectJapaneseType(artist.name);
  const nameJaKanji = nameType === "kanji" || nameType === "mixed" ? artist.name : undefined;
  const nameJaKana = nameType === "kana" ? artist.name : artist.aliases.find((a) => a.locale === "JA_KANA")?.alias;

  // 인기도
  const popularity = artist.spotifyArtist?.popularity ?? undefined;

  // 기본 이름을 q_name_* 필드에 추가
  const q_name_ko_p = nameKo ? [nameKo, ...(nameAliases.q_name_ko_p || [])] : nameAliases.q_name_ko_p;
  const q_name_latin_p = nameLatin ? [nameLatin, ...(nameAliases.q_name_latin_p || [])] : nameAliases.q_name_latin_p;

  // 일본어 처리
  let q_name_ja_kanji_p = nameAliases.q_name_ja_kanji_p;
  let q_name_ja_kana_p = nameAliases.q_name_ja_kana_p;
  let q_name_ja_kana_a = nameAliases.q_name_ja_kana_a;

  if (nameType === "kanji" || nameType === "mixed") {
    // 한자가 포함된 경우 → ja_kanji_p에 추가
    q_name_ja_kanji_p = nameJaKanji ? [nameJaKanji, ...(nameAliases.q_name_ja_kanji_p || [])] : nameAliases.q_name_ja_kanji_p;
  } else if (nameType === "kana") {
    // 가나만 있는 경우 → ja_kana_p에 추가 + 히라가나 변환도 ja_kana_a에 추가
    q_name_ja_kana_p = nameJaKana ? [nameJaKana, ...(nameAliases.q_name_ja_kana_p || [])] : nameAliases.q_name_ja_kana_p;

    // 카타카나면 히라가나 버전도 추가
    if (nameJaKana && /[\u30a0-\u30ff]/.test(nameJaKana)) {
      const hiragana = katakanaToHiragana(nameJaKana);
      q_name_ja_kana_a = [hiragana, ...(nameAliases.q_name_ja_kana_a || [])];
    }
  }

  return {
    id: artist.id.toString(),
    homeCatalog: artist.homeCatalog ?? undefined,

    nameKo,
    nameJaKanji,
    nameJaKana,
    nameLatin,

    popularity,
    updatedAt: Math.floor(artist.updatedAt.getTime() / 1000),

    // 이름 별칭 필드 (한국어)
    q_name_ko_p,
    q_name_ko_a: nameAliases.q_name_ko_a,
    q_name_ko_a2: nameAliases.q_name_ko_a2,
    q_name_ko_f: nameAliases.q_name_ko_f,

    // 이름 별칭 필드 (라틴)
    q_name_latin_p,
    q_name_latin_a: nameAliases.q_name_latin_a,
    q_name_latin_a2: nameAliases.q_name_latin_a2,
    q_name_latin_f: nameAliases.q_name_latin_f,

    // 이름 별칭 필드 (일본어 한자)
    q_name_ja_kanji_p,
    q_name_ja_kanji_a: nameAliases.q_name_ja_kanji_a,
    q_name_ja_kanji_a2: nameAliases.q_name_ja_kanji_a2,
    q_name_ja_kanji_f: nameAliases.q_name_ja_kanji_f,

    // 이름 별칭 필드 (일본어 가나)
    q_name_ja_kana_p,
    q_name_ja_kana_a,
    q_name_ja_kana_a2: nameAliases.q_name_ja_kana_a2,
    q_name_ja_kana_f: nameAliases.q_name_ja_kana_f,
  };
}
