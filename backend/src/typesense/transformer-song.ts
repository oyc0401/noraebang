import type { PrismaClient } from "@prisma/client";
import {
  calculateArtistPopularity,
  calculateSongPopularity,
} from "./lib/popularity";
import { normalizeBasic } from "./lib/text-utils";
import {
  getNormalizedValues,
  getPronunciationValues,
  getPrimaryValues,
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
      nameJa?: string;
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
  titleJa?: string;
  titleLatin?: string;
  titleJaPronu?: string;
  titleLatinPronu?: string;

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

  q_song_ja_p?: string[];
  q_song_ja_a?: string[];
  q_song_ja_norm?: string[];

  q_song_pronu?: string[];

  artist_key?: string[];

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
    titleJa: song.titleJa ?? undefined,
    titleLatin: song.titleLatin ?? undefined,
    titleJaPronu: song.titleJaPronu ?? undefined,
    titleLatinPronu: song.titleLatinPronu ?? undefined,

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

    q_song_ja_p: createQuerySongJaPrimary(song),
    q_song_ja_a: createQuerySongJaAlias(song),
    q_song_ja_norm: createQuerySongJaNorm(song),

    q_song_pronu: createQuerySongPronu(song),

    artist_key: createArtistKey(song),

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

const createQuerySongJaPrimary = (song: SongWithRelations) => {
  if (!song.titleJa) return undefined;
  return getPrimaryValues(song.titleJa);
};

const createQuerySongJaNorm = (song: SongWithRelations) => {
  if (!song.titleJa) return undefined;
  return getNormalizedValues(song.titleJa);
};
const createQuerySongJaAlias = (_song: SongWithRelations) => undefined;

const createQuerySongPronu = (song: SongWithRelations) => {
  const prons = [song.titleJaPronu, song.titleLatinPronu]
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

/**
 * artist_key: artistKoNorm, artistLatinNorm, artistJaNorm, artistPron을 합친 배열
 */
const createArtistKey = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const results = new Set<string>();

  for (const artist of artists) {
    // artistKoNorm
    for (const val of getNormalizedValues(artist.nameKo)) {
      results.add(val);
    }

    // artistLatinNorm
    if (artist.nameLatin) {
      for (const val of getNormalizedValues(artist.nameLatin)) {
        results.add(val);
      }
    }

    // artistJaNorm
    if (artist.nameJa) {
      for (const val of getNormalizedValues(artist.nameJa)) {
        results.add(val);
      }
    }

    // artistPron
    if (artist.nameJaPronu) {
      const trimmed = artist.nameJaPronu.trim();
      if (trimmed.length > 0) {
        for (const val of getPronunciationValues(trimmed)) {
          results.add(val);
        }
      }
    }
  }

  return results.size > 0 ? Array.from(results) : undefined;
};

const createQueryComboArtist = (song: SongWithRelations) => {
  const mainArtist = getSongArtists(song)[0];
  const titleKoNorm = song.titleKo ? normalizeBasic(song.titleKo) : undefined;
  const artistKoNorm = mainArtist?.nameKo
    ? normalizeBasic(mainArtist.nameKo)
    : undefined;

  if (!titleKoNorm || !artistKoNorm) {
    return undefined;
  }
  return [`${titleKoNorm}${artistKoNorm}`];
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
