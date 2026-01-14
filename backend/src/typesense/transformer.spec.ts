// pnpm test transformer.spec.ts
//
// Typesense transformer 유틸리티 함수 테스트

import { transformSongToDocument } from "./transformer-song";
import { transformArtistToDocument } from "./transformer-artist";

describe("transformArtistToDocument", () => {
  it("카타카나 아티스트명은 히라가나 변환을 포함한 정규화 값을 생성해야 함", () => {
    const artist = {
      id: 1,
      name: "ガラクタ",
      nameKo: "가라쿠타",
      nameJaKana: "ガラクタ",
      updatedAt: new Date("2025-01-01"),
      artistSongs: [],
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ja_kana_p).toEqual(["ガラクタ"]);
    expect(result.q_name_ja_kana_norm).toContain("がらくた");
    expect(result.q_name_ja_kana_norm).toContain("ガラクタ");
  });

  it("spotify 인기도와 TJ 곡 수를 함께 사용해 popularity를 계산해야 함", () => {
    const artist = {
      id: 2,
      name: "YOASOBI",
      nameKo: "요아소비",
      updatedAt: new Date("2025-01-01"),
      artistSongs: [
        {
          song: {
            tjSong: {
              id: "12345",
            },
          },
        },
        {
          song: {
            tjSong: {
              id: "67890",
            },
          },
        },
      ],
      spotifyArtist: { popularity: 80 },
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.popularity).toBe(82); // 80 + 2 TJ songs
    expect(result.spotifyPopularity).toBe(80);
    expect(result.tjSongCount).toBe(2);
  });

  it("아티스트 발음 토큰을 세 가지 버전으로 생성해야 함", () => {
    const artist = {
      id: 3,
      name: "Kana Artist",
      nameKo: "카나 아티스트",
      nameJaPronu: "ラブ-ラブ!!",
      updatedAt: new Date("2025-01-01"),
      artistSongs: [],
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_artist_pron).toBeDefined();
    expect(result.q_artist_pron).toEqual(
      expect.arrayContaining(["ラブ-ラブ!!", "ラブ ラブ", "ラブラブ"]),
    );
  });
});

describe("transformSongToDocument", () => {
  function createSong(overrides: Partial<any> = {}) {
    const base = {
      id: 100,
      title: "밤을 달리다",
      catalog: "JPOP",
      updatedAt: new Date("2025-01-01"),
      titleKo: "밤을 달리다",
      titleLatin: "yoru ni kakeru",
      titleJaKanji: "夜に駆ける",
      titleJaKana: "ヨルニカケル",
      artistSongs: [
        {
          artist: {
            id: 10,
            name: "YOASOBI",
            nameKo: "요아소비",
            nameLatin: "YOASOBI",
            nameJaKanji: "夜遊び",
            nameJaKana: "よあそび",
            spotifyArtist: { popularity: 80 },
            tjSongs: [{ tjSongId: "TJ001" }],
          },
        },
        {
          artist: {
            id: 11,
            name: "Ikura",
            nameKo: "이쿠라",
            nameLatin: "Ikura",
            nameJaKanji: "幾田",
            nameJaKana: "いくだ",
            spotifyArtist: null,
            tjSongs: [],
          },
        },
      ],
      tjSongId: "12345",
      spotifyTrack: {
        spotifyTrack: {
          popularity: 70,
        },
      },
    };

    return { ...base, ...overrides };
  }

  it("기본 제목에서 normalized 곡 필드를 생성해야 함", () => {
    const song = createSong();
    const result = transformSongToDocument(song as any);

    expect(result.q_song_ko_p).toEqual(["밤을 달리다"]);
    expect(result.q_song_ko_norm).toEqual(["밤을달리다"]);
    expect(result.q_song_latin_norm).toContain("yorunikakeru");
    expect(result.q_song_ja_kana_norm).toContain("よるにかける");
  });

  it("라틴 제목은 특수문자를 공백으로 정리한 값을 추가하고 norm에는 공백 제거 버전을 넣어야 함", () => {
    const song = createSong({ titleLatin: "Good bye-bye" });
    const result = transformSongToDocument(song as any);

    expect(result.q_song_latin_p).toEqual(["Good bye-bye", "Good bye bye"]);
    expect(result.q_song_latin_norm).toEqual(["Goodbyebye"]);
  });

  it("아티스트 이름 정규화와 콤보 필드를 생성해야 함", () => {
    const song = createSong();
    const result = transformSongToDocument(song as any);

    expect(result.q_artist_ko_p).toContain("요아소비");
    expect(result.q_artist_ko_norm).toContain("요아소비");
    expect(result.q_artist_latin_norm).toContain("YOASOBI");
    expect(result.q_artist_ja_kanji_norm).toContain("夜遊び");
    expect(result.q_artist_ja_kana_norm).toContain("よあそび");
    expect(result.q_combo_a).toEqual(["밤을달리다요아소비"]);
  });

  it("인기도 정보를 통합해 songPopularity를 계산해야 함", () => {
    const song = createSong();
    const result = transformSongToDocument(song as any);

    // artistPopularity(80 + 1 tj song) + spotifyTrackPopularity(70) + tjBonus(5)
    expect(result.artistPopularity).toBe(81);
    expect(result.spotifyTrackPopularity).toBe(70);
    expect(result.songPopularity).toBe(156);
  });

  it("티제이 곡만 있어도 인기도가 계산되어야 함", () => {
    const song = createSong({
      tjSongId: "TJ-002",
      spotifyTrack: undefined,
      artistSongs: [
        {
          artist: {
            id: 20,
            name: "Acoustic Band",
            nameKo: "어쿠스틱밴드",
            nameLatin: "Acoustic Band",
            nameJaKanji: null,
            nameJaKana: null,
            spotifyArtist: null,
            tjSongs: [{ tjSongId: "TJ-002" }, { tjSongId: "TJ-003" }],
          },
        },
      ],
    });
    const result = transformSongToDocument(song as any);

    expect(result.artistPopularity).toBe(2);
    expect(result.songPopularity).toBe(7); // artistPopularity 2 + tj bonus 5
  });
});
