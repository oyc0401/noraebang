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
  getPronunciationValues,
  getPrimaryValues,
  getPrimaryValuesByList,
  isPresent,
} from "./transformer-utils";

export type SongWithRelations = Awaited<
  ReturnType<PrismaClient["song"]["findMany"]>
>[number] & {
  score?: number | null;
  artistSongs: Array<{
    artist: {
      id: number;
      name: string;
      nameKo: string;
      nameLatin?: string;
      nameJaKana?: string;
      nameJaKanji?: string;
      nameJaPronu?: string | null;
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
  songSpotifyTracks?: Array<{
    spotifyTrack: {
      popularity?: number;
    };
  }>;
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

  q_artist_pron?: string[];

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
  return {
    id: song.id.toString(),
    catalog: song.catalog ?? undefined,

    titleKo: song.titleKo ?? undefined,
    titleJaKanji: song.titleJaKanji ?? undefined,
    titleJaKana: song.titleJaKana ?? undefined,
    titleLatin: song.titleLatin ?? undefined,

    artistIds: getSongArtists(song).map((a) => a.id.toString()),

    tjSongId: song.tjSong?.id ?? undefined,

    songPopularity: createSongPopularity(song),
    artistPopularity: calculateArtistPopularity({
      spotifyPopularity: createArtistSpotifyPopularity(song),
      tjSongCount: createTjSongCount(song),
    }),
    spotifyTrackPopularity: createSpotifyTrackPopularity(song),
    artistSpotifyPopularity: createArtistSpotifyPopularity(song),
    artistTjSongCount: createTjSongCount(song),
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

    q_artist_pron: createQueryArtistPron(song),

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

const createQueryArtistPron = (song: SongWithRelations) => {
  const prons = getSongArtists(song)
    .map((artist) => artist.nameJaPronu)
    .filter(isPresent)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (prons.length === 0) return undefined;

  const results = new Set<string>();
  for (const pron of prons) {
    for (const token of getPronunciationValues(pron)) {
      results.add(token);
    }
  }

  return results.size > 0 ? Array.from(results) : undefined;
};

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

/**
 * 인기도 계산
 */
function createTjSongCount(song: SongWithRelations) {
  const artists = getSongArtists(song);
  const counts = artists.map((artist) => artist.tjSongs?.length ?? 0);
  return counts.length > 0 ? Math.max(...counts) : 0;
}

function createArtistSpotifyPopularity(song: SongWithRelations) {
  const artists = getSongArtists(song);
  const popularities = artists
    .map((artist) => artist.spotifyArtist?.popularity)
    .filter(isPresent);
  return popularities.length > 0 ? Math.max(...popularities) : 0;
}

function createSpotifyTrackPopularity(song: SongWithRelations) {
  const popularities =
    song.songSpotifyTracks
      ?.map((sst) => sst.spotifyTrack?.popularity)
      .filter((p): p is number => p !== undefined && p !== null) ?? [];
  return popularities.length > 0 ? Math.max(...popularities) : 0;
}

function createSongPopularity(song: SongWithRelations) {
  if (typeof song.score === "number") {
    return song.score;
  }

  const spotifyTrackPopularity = createSpotifyTrackPopularity(song);
  const artistSpotifyPopularity = createArtistSpotifyPopularity(song);
  const tjSongCount = createTjSongCount(song);

  const artistPopularity = calculateArtistPopularity({
    spotifyPopularity: artistSpotifyPopularity,
    tjSongCount,
  });

  const hasTjSong = tjSongCount > 0;
  const songPopularity = calculateSongPopularity({
    artistPopularity,
    spotifyTrackPopularity,
    hasTjSong,
  });

  return songPopularity;
}
