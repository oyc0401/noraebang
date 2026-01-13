import type { PrismaClient } from "@prisma/client";
import {
  calculateArtistPopularity,
  calculateSongPopularity,
} from "./lib/popularity";
import { removeSpaces } from "./lib/text-utils";
import {
  getJapaneseNormalizedValues,
  getNormalizedValues,
  getNormalizedValuesByList,
  getPrimaryValues,
  getPrimaryValuesByList,
  isPresent,
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
  tjSong?: {
    id: string;
  };
  spotifyTrack?: {
    spotifyTrack?: {
      popularity?: number;
    };
  };
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
  if (!song.titleKo) return undefined;
  return getPrimaryValues(song.titleKo);
};

const createQuerySongKoNorm = (song: SongWithRelations) => {
  if (!song.titleKo) return undefined;
  return getNormalizedValues(song.titleKo);
};
const createQuerySongKoAlias = (_song: SongWithRelations) => undefined;

const createQuerySongLatinPrimary = (song: SongWithRelations) => {
  if (!song.titleLatin) return undefined;
  return getPrimaryValues(song.titleLatin);
};

const createQuerySongLatinNorm = (song: SongWithRelations) => {
  if (!song.titleLatin) return undefined;
  return getNormalizedValues(song.titleLatin);
};
const createQuerySongLatinAlias = (_song: SongWithRelations) => undefined;

const createQuerySongJaKanjiPrimary = (song: SongWithRelations) => {
  if (!song.titleJaKanji) return undefined;
  return getPrimaryValues(song.titleJaKanji);
};

const createQuerySongJaKanjiNorm = (song: SongWithRelations) => {
  if (!song.titleJaKanji) return undefined;
  return getJapaneseNormalizedValues(song.titleJaKanji);
};
const createQuerySongJaKanjiAlias = (_song: SongWithRelations) => undefined;

const createQuerySongJaKanaPrimary = (song: SongWithRelations) => {
  if (!song.titleJaKana) return undefined;
  return getPrimaryValues(song.titleJaKana);
};

const createQuerySongJaKanaNorm = (song: SongWithRelations) => {
  if (!song.titleJaKana) return undefined;
  return getJapaneseNormalizedValues(song.titleJaKana);
};
const createQuerySongJaKanaAlias = (_song: SongWithRelations) => undefined;

const createQueryArtistKoPrimary = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const arsistNameList = artists.map((a) => a.nameKo);
  return getPrimaryValuesByList(arsistNameList);
};

const createQueryArtistKoNorm = (song: SongWithRelations) => {
  const arsistNameList = getSongArtists(song).map((a) => a.nameKo);
  return getNormalizedValuesByList(arsistNameList);
};

const createQueryArtistKoAlias = (_song: SongWithRelations) => undefined;

const createQueryArtistLatinPrimary = (song: SongWithRelations) => {
  const arsistNameList = getSongArtists(song)
    .map((a) => a.nameLatin)
    .filter(isPresent);
  return getPrimaryValuesByList(arsistNameList);
};

const createQueryArtistLatinNorm = (song: SongWithRelations) => {
  const arsistNameList = getSongArtists(song)
    .map((a) => a.nameLatin)
    .filter(isPresent);
  return getNormalizedValuesByList(arsistNameList);
};

const createQueryArtistLatinAlias = (_song: SongWithRelations) => undefined;

const createQueryArtistJaKanjiPrimary = (song: SongWithRelations) => {
  const arsistNameList = getSongArtists(song)
    .map((a) => a.nameJaKanji)
    .filter(isPresent);
  return getPrimaryValuesByList(arsistNameList);
};

const createQueryArtistJaKanjiNorm = (song: SongWithRelations) => {
  const arsistNameList = getSongArtists(song)
    .map((a) => a.nameJaKanji)
    .filter(isPresent);
  return getNormalizedValuesByList(arsistNameList);
};

const createQueryArtistJaKanjiAlias = (_song: SongWithRelations) => undefined;

const createQueryArtistJaKanaPrimary = (song: SongWithRelations) => {
  const arsistNameList = getSongArtists(song)
    .map((a) => a.nameJaKana)
    .filter(isPresent);
  return getPrimaryValuesByList(arsistNameList);
};

const createQueryArtistJaKanaNorm = (song: SongWithRelations) => {
  const arsistNameList = getSongArtists(song)
    .map((a) => a.nameJaKana)
    .filter(isPresent);
  return getNormalizedValuesByList(arsistNameList);
};

const createQueryArtistJaKanaAlias = (_song: SongWithRelations) => undefined;

const createQueryComboArtist = (song: SongWithRelations) => {
  const mainArtist = getSongArtists(song)[0];
  const titleKoNoSpace = song.titleKo ? removeSpaces(song.titleKo) : undefined;
  const artistKoNoSpace = mainArtist?.nameKo
    ? removeSpaces(mainArtist.nameKo)
    : undefined;

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
    ? calculateArtistPopularity({
        spotifyPopularity: artistSpotifyPopularity,
        tjSongCount: artistTjSongCount ?? 0,
      })
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
