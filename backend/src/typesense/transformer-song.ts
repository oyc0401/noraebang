import type { PrismaClient } from "@prisma/client";
import { normalizeBasic, removePunctuation } from "./lib/text-utils";
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
    artist?: string | null;
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

  songScore?: number;
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
  q_song_pronu_norm?: string[];

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
  const songKo = createQuerySongKo(song);
  const songLatin = createQuerySongLatin(song);
  const songJa = createQuerySongJa(song);
  const songPronu = createQuerySongPronu(song);

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

    songScore: song.score ?? 0,
    updatedAt: Math.floor(song.updatedAt.getTime() / 1000),

    q_song_ko_p: songKo.p,
    q_song_ko_a: createQuerySongKoAlias(song),
    q_song_ko_norm: songKo.norm,

    q_song_latin_p: songLatin.p,
    q_song_latin_a: createQuerySongLatinAlias(song),
    q_song_latin_norm: songLatin.norm,

    q_song_ja_p: songJa.p,
    q_song_ja_a: createQuerySongJaAlias(song),
    q_song_ja_norm: songJa.norm,

    q_song_pronu: songPronu.p,
    q_song_pronu_norm: songPronu.norm,

    artist_key: createArtistKey(song),

    q_combo_a: createQueryComboArtist(song),
  };
}

interface PNormResult {
  p?: string[];
  norm?: string[];
}

/**
 * p와 norm을 생성하고, 중복이 있으면 p에서 제거
 */
function createPNorm(text: string | undefined | null): PNormResult {
  if (!text) return {};

  const pValues = getPrimaryValues(text);
  const normValues = getNormalizedValues(text);
  const normSet = new Set(normValues);

  // p에서 norm과 중복되는 값 제거
  const pFiltered = pValues.filter((v) => !normSet.has(v));

  return {
    p: pFiltered.length > 0 ? pFiltered : undefined,
    norm: normValues.length > 0 ? normValues : undefined,
  };
}

const createQuerySongKo = (song: SongWithRelations) => createPNorm(song.titleKo);
const createQuerySongLatin = (song: SongWithRelations) => createPNorm(song.titleLatin);
const createQuerySongJa = (song: SongWithRelations) => createPNorm(song.titleJa);

const createQuerySongKoAlias = (_song: SongWithRelations) => undefined;
const createQuerySongLatinAlias = (_song: SongWithRelations) => undefined;
const createQuerySongJaAlias = (_song: SongWithRelations) => undefined;

const createQuerySongPronu = (song: SongWithRelations): PNormResult => {
  const prons = [song.titleJaPronu, song.titleLatinPronu]
    .filter(isPresent)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (prons.length === 0) return {};

  const pSet = new Set<string>();
  const normSet = new Set<string>();

  for (const pron of prons) {
    pSet.add(removePunctuation(pron));
    normSet.add(normalizeBasic(pron));
  }

  // p에서 norm과 중복되는 값 제거
  const pFiltered = Array.from(pSet).filter((v) => !normSet.has(v));
  const normValues = Array.from(normSet);

  return {
    p: pFiltered.length > 0 ? pFiltered : undefined,
    norm: normValues.length > 0 ? normValues : undefined,
  };
};

/**
 * artist_key: artistKoNorm, artistLatinNorm, artistJaNorm, artistPron을 합친 배열
 * artist가 없으면 tjSong.artist 사용
 */
const createArtistKey = (song: SongWithRelations) => {
  const artists = getSongArtists(song);
  const results = new Set<string>();

  if (artists.length > 0) {
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
  } else if (song.tjSong?.artist) {
    // artist가 없으면 tjSong.artist 사용
    for (const val of getNormalizedValues(song.tjSong.artist)) {
      results.add(val);
    }
  }

  return results.size > 0 ? Array.from(results) : undefined;
};

const createQueryComboArtist = (song: SongWithRelations) => {
  const mainArtist = getSongArtists(song)[0];
  const titleKoNorm = song.titleKo ? normalizeBasic(song.titleKo) : undefined;
  // artist가 있으면 artist.nameKo, 없으면 tjSong.artist 사용
  const artistKoNorm = mainArtist?.nameKo
    ? normalizeBasic(mainArtist.nameKo)
    : song.tjSong?.artist
      ? normalizeBasic(song.tjSong.artist)
      : undefined;

  if (!titleKoNorm || !artistKoNorm) {
    return undefined;
  }
  return [`${titleKoNorm}${artistKoNorm}`];
};

