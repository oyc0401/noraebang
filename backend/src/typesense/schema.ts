import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";

export const SONGS_COLLECTION_NAME = "songs";
export const ARTISTS_COLLECTION_NAME = "artists";

/**
 * Songs Collection 스키마
 *
 * README.md 참고:
 * - q_* 필드: 검색용 토큰 (P/A/A2/F 티어)
 * - tjSongId: 표시용만 (검색 안 함)
 * - locale: KO, JA_KANA, JA_KANJI, LATIN
 */
export const songsCollectionSchema: CollectionCreateSchema = {
  name: SONGS_COLLECTION_NAME,
  fields: [
    // ===== 메타 정보 =====
    { name: "id", type: "string" },
    { name: "catalog", type: "string", optional: true }, // "JPOP", "KPOP", etc.

    // ===== 표시용 제목 (검색 안 함) =====
    { name: "titleKo", type: "string", optional: true, index: false },
    { name: "titleJa", type: "string", optional: true, index: false },
    { name: "titleLatin", type: "string", optional: true, index: false },
    { name: "titleJaPronu", type: "string", optional: true, index: false },
    { name: "titleLatinPronu", type: "string", optional: true, index: false },

    // ===== 아티스트 ID (필터링용) =====
    { name: "artistIds", type: "string[]" },

    // ===== TJ 곡 ID (표시용만, 검색 안 함) =====
    { name: "tjSongId", type: "string", optional: true, index: false },

    // ===== 정렬/랭킹 필드 =====
    { name: "songPopularity", type: "float", optional: true }, // 최종 곡 인기도
    { name: "artistPopularity", type: "float", optional: true }, // 메인 아티스트 인기도
    { name: "spotifyTrackPopularity", type: "float", optional: true }, // Spotify 트랙 인기도
    {
      name: "artistSpotifyPopularity",
      type: "float",
      optional: true,
    }, // 메인 아티스트 Spotify 인기도
    {
      name: "artistTjSongCount",
      type: "int32",
      optional: true,
      index: false,
    }, // 메인 아티스트 TJ 곡 수
    { name: "updatedAt", type: "int64" }, // Unix timestamp

    // ===== 검색 필드: 곡명 =====
    { name: "q_song_ko_p", type: "string[]", optional: true },
    { name: "q_song_ko_a", type: "string[]", optional: true },
    { name: "q_song_ko_norm", type: "string[]", optional: true },

    { name: "q_song_latin_p", type: "string[]", optional: true },
    { name: "q_song_latin_a", type: "string[]", optional: true },
    { name: "q_song_latin_norm", type: "string[]", optional: true },

    { name: "q_song_ja_p", type: "string[]", optional: true },
    { name: "q_song_ja_a", type: "string[]", optional: true },
    { name: "q_song_ja_norm", type: "string[]", optional: true },

    { name: "q_song_pronu", type: "string[]", optional: true },

    // ===== 아티스트 검색키 (koNorm + latinNorm + jaNorm + pron) =====
    { name: "artist_key", type: "string[]", optional: true },

    // ===== 조합 검색 (곡+아티스트) =====
    { name: "q_combo_a", type: "string[]", optional: true },
  ],
  default_sorting_field: "updatedAt",
};

/**
 * Artists Collection 스키마
 *
 * README.md 참고:
 * - q_name_* 필드: 검색용 토큰 (P/A/A2/F 티어)
 * - locale: KO, JA_KANA, JA_KANJI, LATIN (아티스트는 raw로 표기)
 */
export const artistsCollectionSchema: CollectionCreateSchema = {
  name: ARTISTS_COLLECTION_NAME,
  fields: [
    // ===== 메타 정보 =====
    { name: "id", type: "string" },
    { name: "homeCatalog", type: "string", optional: true }, // "JPOP", "KPOP", etc.

    // ===== 표시용 이름 (검색 안 함) =====
    { name: "nameKo", type: "string", optional: true, index: false },
    { name: "nameJaKanji", type: "string", optional: true, index: false },
    { name: "nameJaKana", type: "string", optional: true, index: false },
    { name: "nameLatin", type: "string", optional: true, index: false },

    // ===== 정렬/랭킹 필드 =====
    { name: "popularity", type: "float", optional: true },
    { name: "spotifyPopularity", type: "float", optional: true, index: false },
    { name: "tjSongCount", type: "int32", optional: true, index: false }, // Number of TJ songs
    { name: "updatedAt", type: "int64" }, // Unix timestamp

    // ===== 검색 필드: 아티스트명 (한국어) =====
    { name: "q_name_ko_p", type: "string[]", optional: true },
    { name: "q_name_ko_a", type: "string[]", optional: true },
    { name: "q_name_ko_norm", type: "string[]", optional: true },

    // ===== 검색 필드: 아티스트명 (라틴/원어) =====
    { name: "q_name_latin_p", type: "string[]", optional: true },
    { name: "q_name_latin_a", type: "string[]", optional: true },
    { name: "q_name_latin_norm", type: "string[]", optional: true },

    // ===== 검색 필드: 아티스트명 (일본어 한자) =====
    { name: "q_name_ja_kanji_p", type: "string[]", optional: true },
    { name: "q_name_ja_kanji_a", type: "string[]", optional: true },
    { name: "q_name_ja_kanji_norm", type: "string[]", optional: true },

    // ===== 검색 필드: 아티스트명 (일본어 가나) =====
    { name: "q_name_ja_kana_p", type: "string[]", optional: true },
    { name: "q_name_ja_kana_a", type: "string[]", optional: true },
    { name: "q_name_ja_kana_norm", type: "string[]", optional: true },

    // ===== 검색 필드: 아티스트 발음 =====
    { name: "q_artist_pron", type: "string[]", optional: true },
  ],
  default_sorting_field: "updatedAt",
};
