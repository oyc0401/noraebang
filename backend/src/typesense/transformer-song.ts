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

type SongArtist = SongWithRelations["artistSongs"][number]["artist"];

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




  q_artist_ja_kanji_p?: string[];
  q_artist_ja_kanji_a?: string[];
    q_artist_ja_kanji_norm?: string[];

  q_artist_ja_kana_p?: string[];
  q_artist_ja_kana_a?: string[];
    q_artist_ja_kana_norm?: string[];

  q_combo_a?: string[];
}

function getSongArtists(song: SongWithRelations): SongArtist[] {
  return song.artistSongs.map((artistSong) => artistSong.artist);
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

  const {
    songPopularity,
    artistPopularity,
    artistSpotifyPopularity,
    artistTjSongCount,
    spotifyTrackPopularity,
    hasTjSong,
  } = createSongPopularity(song);

  return {
    id: song.id.toString(),
    catalog: song.catalog ?? undefined,

    titleKo: song.titleKo ?? undefined,
    titleJaKanji: song.titleJaKanji ?? undefined,
    titleJaKana: song.titleJaKana ?? undefined,
    titleLatin: song.titleLatin ?? undefined,

    artistIds: getSongArtists(song).map((a) => a.id.toString()),

    tjSongId: song.tjSong?.id ?? undefined,

    songPopularity,
    artistPopularity,
    spotifyTrackPopularity,
    artistSpotifyPopularity,
    artistTjSongCount,
    hasTjSong,
    updatedAt: Math.floor(song.updatedAt.getTime() / 1000),

    q_song_ko_p: createQuerySongKoPrimary(song),
    q_song_ko_a: createQuerySongKoAlias(song),
    q_song_ko_norm: createQuerySongKoNorm(song),

    q_song_latin_p: createQuerySongLatinPrimary(song),
    q_song_latin_a: createQuerySongLatinAlias(song),
    q_song_latin_norm: createQuerySongLatinNorm(song),

    q_song_ja_kanji_p: createQuerySongJaKanjiPrimary(song),
    q_song_ja_kanji_a: createQuerySongJaKanjiAlias(song),
    q_song_ja_kanji_norm: createQuerySongJaKanjiNorm(song),

    q_song_ja_kana_p: createQuerySongJaKanaPrimary(song),
    q_song_ja_kana_a: createQuerySongJaKanaAlias(song),
    q_song_ja_kana_norm: createQuerySongJaKanaNorm(song),

    q_artist_ko_p: createQueryArtistKoPrimary(song),
    q_artist_ko_a: createQueryArtistKoAlias(song),
    q_artist_ko_norm: createQueryArtistKoNorm(song),

    q_artist_latin_p: createQueryArtistLatinPrimary(song),
    q_artist_latin_a: createQueryArtistLatinAlias(song),
    q_artist_latin_norm: createQueryArtistLatinNorm(song),

    q_artist_ja_kanji_p: createQueryArtistJaKanjiPrimary(song),
    q_artist_ja_kanji_a: createQueryArtistJaKanjiAlias(song),
    q_artist_ja_kanji_norm: createQueryArtistJaKanjiNorm(song),

    q_artist_ja_kana_p: createQueryArtistJaKanaPrimary(song),
    q_artist_ja_kana_a: createQueryArtistJaKanaAlias(song),
    q_artist_ja_kana_norm: createQueryArtistJaKanaNorm(song),

    q_combo_a: createQueryComboArtist(song),
  };
}

const createQuerySongKoPrimary = (song: SongWithRelations) => {
  return buildPrimaryValues(song.titleKo);
};

const createQuerySongKoAlias = (_song: SongWithRelations) => undefined;

const createQuerySongKoNorm = (song: SongWithRelations) => {
  return buildNormalizedValues(song.titleKo);
};

const createQuerySongLatinPrimary = (song: SongWithRelations) => {
  return buildPrimaryValues(song.titleLatin);
};

const createQuerySongLatinAlias = (_song: SongWithRelations) => undefined;

const createQuerySongLatinNorm = (song: SongWithRelations) => {
  return buildNormalizedValues(song.titleLatin);
};

const createQuerySongJaKanjiPrimary = (song: SongWithRelations) => {
  return buildPrimaryValues(song.titleJaKanji);
};

const createQuerySongJaKanjiAlias = (_song: SongWithRelations) => undefined;

const createQuerySongJaKanjiNorm = (song: SongWithRelations) => {
  return buildJapaneseNormalizedValues(song.titleJaKanji);
};

const createQuerySongJaKanaPrimary = (song: SongWithRelations) => {
  return buildPrimaryValues(song.titleJaKana);
};

const createQuerySongJaKanaAlias = (_song: SongWithRelations) => undefined;

const createQuerySongJaKanaNorm = (song: SongWithRelations) => {
  return buildJapaneseNormalizedValues(song.titleJaKana);
};

const createQueryArtistKoPrimary = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const values: string[] = [];
  for (const artist of artists) {
    addPrimaryVariants(values, artist.nameKo);
  }
  return values.length > 0 ? values : undefined;
};

const createQueryArtistKoAlias = (_song: SongWithRelations) => undefined;

const createQueryArtistKoNorm = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const values = new Set<string>();
  for (const artist of artists) {
    addNormalizedValue(values, artist.nameKo);
  }
  return values.size > 0 ? Array.from(values) : undefined;
};

const createQueryArtistLatinPrimary = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const values: string[] = [];
  for (const artist of artists) {
    addPrimaryVariants(values, artist.nameLatin);
  }
  return values.length > 0 ? values : undefined;
};

const createQueryArtistLatinAlias = (_song: SongWithRelations) => undefined;

const createQueryArtistLatinNorm = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const values = new Set<string>();
  for (const artist of artists) {
    addNormalizedValue(values, artist.nameLatin);
  }
  return values.size > 0 ? Array.from(values) : undefined;
};

const createQueryArtistJaKanjiPrimary = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const values: string[] = [];
  for (const artist of artists) {
    addPrimaryVariants(values, artist.nameJaKanji);
  }
  return values.length > 0 ? values : undefined;
};

const createQueryArtistJaKanjiAlias = (_song: SongWithRelations) => undefined;

const createQueryArtistJaKanjiNorm = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const values = new Set<string>();
  for (const artist of artists) {
    addJapaneseNormalizedValues(values, artist.nameJaKanji);
  }
  return values.size > 0 ? Array.from(values) : undefined;
};

const createQueryArtistJaKanaPrimary = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const values: string[] = [];
  for (const artist of artists) {
    addPrimaryVariants(values, artist.nameJaKana);
  }
  return values.length > 0 ? values : undefined;
};

const createQueryArtistJaKanaAlias = (_song: SongWithRelations) => undefined;

const createQueryArtistJaKanaNorm = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const values = new Set<string>();
  for (const artist of artists) {
    addJapaneseNormalizedValues(values, artist.nameJaKana);
  }
  return values.size > 0 ? Array.from(values) : undefined;
};

const createQueryComboArtist = (song: SongWithRelations) => {
  const mainArtist = getSongArtists(song)[0];
  const titleKoNoSpace = song.titleKo ? removeSpaces(song.titleKo) : undefined;
  const artistKoNoSpace =
    mainArtist?.nameKo ? removeSpaces(mainArtist.nameKo) : undefined;

  if (!titleKoNoSpace || !artistKoNoSpace) {
    return undefined;
  }
  return [`${titleKoNoSpace}${artistKoNoSpace}`];
};

function createSongPopularity(song: SongWithRelations) {
  const artists = getSongArtists(song);
  const mainArtist = artists[0];

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
    ? calculateArtistPopularity({spotifyPopularity: artistSpotifyPopularity,tjSongCount: artistTjSongCount ?? 0})
    : undefined;

  const hasTjSong = Boolean(song.tjSongId ?? song.tjSong?.id);
  const songPopularity = calculateSongPopularity({
    artistPopularity,
    spotifyTrackPopularity,
    hasTjSong,
  });

  return {
    songPopularity,
    artistPopularity,
    artistSpotifyPopularity,
    artistTjSongCount,
    spotifyTrackPopularity,
    hasTjSong,
  };
}
