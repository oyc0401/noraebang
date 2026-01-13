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
