import type { PrismaClient } from "@prisma/client";
import { calculateArtistPopularity } from "./lib/popularity";
import {
  buildJapaneseNormalizedValues,
  buildNormalizedValues,
  buildPrimaryValues,
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
  nameLatin?: string;
  nameJaKana?: string;
  nameJaKanji?: string;
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
}

/**
 * DB Artist → Typesense Artist Document 변환
 */
export function transformArtistToDocument(
  artist: ArtistWithRelations,
): TypesenseArtistDocument {
  const { popularity, spotifyPopularity, tjSongCount } =
    createArtistPopularity(artist);

  return {
    id: artist.id.toString(),
    homeCatalog: artist.homeCatalog ?? undefined,

    nameKo: artist.nameKo ?? undefined,
    nameJaKanji: artist.nameJaKanji ?? undefined,
    nameJaKana: artist.nameJaKana ?? undefined,
    nameLatin: artist.nameLatin ?? undefined,

    popularity,
    spotifyPopularity,
    tjSongCount,
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
  };
}

const createQueryNameKoPrimary = (artist: ArtistWithRelations) => {
  return buildPrimaryValues(artist.nameKo);
};

const createQueryNameKoAlias = (_artist: ArtistWithRelations) => undefined;

const createQueryNameKoNorm = (artist: ArtistWithRelations) => {
  return buildNormalizedValues(artist.nameKo);
};

const createQueryNameLatinPrimary = (artist: ArtistWithRelations) => {
  return buildPrimaryValues(artist.nameLatin);
};

const createQueryNameLatinAlias = (_artist: ArtistWithRelations) => undefined;

const createQueryNameLatinNorm = (artist: ArtistWithRelations) => {
  return buildNormalizedValues(artist.nameLatin);
};

const createQueryNameJaKanjiPrimary = (artist: ArtistWithRelations) => {
  return buildPrimaryValues(artist.nameJaKanji);
};

const createQueryNameJaKanjiAlias = (_artist: ArtistWithRelations) =>
  undefined;

const createQueryNameJaKanjiNorm = (artist: ArtistWithRelations) => {
  return buildJapaneseNormalizedValues(artist.nameJaKanji);
};

const createQueryNameJaKanaPrimary = (artist: ArtistWithRelations) => {
  return buildPrimaryValues(artist.nameJaKana);
};

const createQueryNameJaKanaAlias = (_artist: ArtistWithRelations) => undefined;

const createQueryNameJaKanaNorm = (artist: ArtistWithRelations) => {
  return buildJapaneseNormalizedValues(artist.nameJaKana);
};

function createArtistPopularity(artist: ArtistWithRelations) {
  const artistSongs = artist.artistSongs ?? [];
  const tjSongCount = artistSongs.reduce((count, artistSong) => {
    return artistSong.song?.tjSong ? count + 1 : count;
  }, 0);

  const spotifyPopularity = artist.spotifyArtist?.popularity ?? undefined;
  const hasPopularitySource =
    spotifyPopularity !== undefined || tjSongCount > 0;
  const popularity = hasPopularitySource
    ? calculateArtistPopularity({spotifyPopularity, tjSongCount})
    : undefined;

  return {
    popularity,
    spotifyPopularity,
    tjSongCount,
  };
}
