import type { PrismaClient } from "@prisma/client";
import { calculateArtistPopularity } from "./lib/popularity";
import {
  getPrimaryValues,
  getJapaneseNormalizedValues,
  getNormalizedValues,
} from "./transformer-utils";

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
};

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

  q_artist_pron?: string[];
}

/**
 * DB Artist → Typesense Artist Document 변환
 */
export function transformArtistToDocument(
  artist: ArtistWithRelations,
): TypesenseArtistDocument {
  return {
    id: artist.id.toString(),
    homeCatalog: artist.homeCatalog ?? undefined,

    nameKo: artist.nameKo ?? undefined,
    nameJaKanji: artist.nameJaKanji ?? undefined,
    nameJaKana: artist.nameJaKana ?? undefined,
    nameLatin: artist.nameLatin ?? undefined,

    popularity: createArtistPopularity(artist),
    spotifyPopularity: artist.spotifyArtist?.popularity ?? 0,
    tjSongCount: createTjSongCount(artist),
    updatedAt: Math.floor(artist.updatedAt.getTime() / 1000),

    q_name_ko_p: createQueryNameKoPrimary(artist),
    q_name_ko_a: createQueryNameKoAlias(artist),
    q_name_ko_norm: createQueryNameKoNorm(artist),

    q_name_latin_p: createQueryNameLatinPrimary(artist),
    q_name_latin_a: createQueryNameLatinAlias(artist),
    q_name_latin_norm: createQueryNameLatinNorm(artist),

    q_name_ja_kanji_p: createQueryNameJaKanjiPrimary(artist),
    q_name_ja_kanji_a: createQueryNameJaKanjiAlias(artist),
    q_name_ja_kanji_norm: createQueryNameJaKanjiNorm(artist),

    q_name_ja_kana_p: createQueryNameJaKanaPrimary(artist),
    q_name_ja_kana_a: createQueryNameJaKanaAlias(artist),
    q_name_ja_kana_norm: createQueryNameJaKanaNorm(artist),

    q_artist_pron: createQueryArtistPron(artist),
  };
}

const createQueryNameKoPrimary = (artist: ArtistWithRelations) => {
  return getPrimaryValues(artist.nameKo);
};

const createQueryNameKoNorm = (artist: ArtistWithRelations) => {
  return getNormalizedValues(artist.nameKo);
};
const createQueryNameKoAlias = (_artist: ArtistWithRelations) => undefined;

const createQueryNameLatinPrimary = (artist: ArtistWithRelations) => {
  if (!artist.nameLatin) return undefined;
  return getPrimaryValues(artist.nameLatin);
};

const createQueryNameLatinNorm = (artist: ArtistWithRelations) => {
  if (!artist.nameLatin) return undefined;
  return getNormalizedValues(artist.nameLatin);
};
const createQueryNameLatinAlias = (_artist: ArtistWithRelations) => undefined;

const createQueryNameJaKanjiPrimary = (artist: ArtistWithRelations) => {
  if (!artist.nameJaKanji) return undefined;
  return getPrimaryValues(artist.nameJaKanji);
};

const createQueryNameJaKanjiNorm = (artist: ArtistWithRelations) => {
  if (!artist.nameJaKanji) return undefined;
  return getJapaneseNormalizedValues(artist.nameJaKanji);
};
const createQueryNameJaKanjiAlias = (_artist: ArtistWithRelations) => undefined;

const createQueryNameJaKanaPrimary = (artist: ArtistWithRelations) => {
  if (!artist.nameJaKana) return undefined;
  return getPrimaryValues(artist.nameJaKana);
};

const createQueryNameJaKanaNorm = (artist: ArtistWithRelations) => {
  if (!artist.nameJaKana) return undefined;
  return getJapaneseNormalizedValues(artist.nameJaKana);
};

const createQueryNameJaKanaAlias = (_artist: ArtistWithRelations) => undefined;

const createQueryArtistPron = (artist: ArtistWithRelations) => {
  const pron = artist.nameJaPronu?.trim();
  if (!pron) return undefined;

  const results = new Set<string>();
  getPrimaryValues(pron)?.forEach((value) => results.add(value));
  getNormalizedValues(pron)?.forEach((value) => results.add(value));

  return results.size > 0 ? Array.from(results) : undefined;
};

/**
 * 인기도 계산
 */
function createTjSongCount(artist: ArtistWithRelations) {
  const artistSongs = artist.artistSongs ?? [];
  return artistSongs.reduce((count, artistSong) => {
    return artistSong.song?.tjSong ? count + 1 : count;
  }, 0);
}

function createArtistPopularity(artist: ArtistWithRelations) {
  const tjSongCount = createTjSongCount(artist);

  const spotifyPopularity = artist.spotifyArtist?.popularity ?? 0;
  const popularity = calculateArtistPopularity({
    spotifyPopularity,
    tjSongCount,
  });

  return popularity;
}
