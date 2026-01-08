// pnpm test transformer.spec.ts
//
// Typesense transformer 유틸리티 함수 테스트

import { transformArtistToDocument, transformSongToDocument } from "./transformer";

describe("katakanaToHiragana", () => {
  // 내부 함수이므로 transformArtistToDocument를 통해 간접 테스트

  it("카타카나 아티스트명은 ja_kana_p에 원본, ja_kana_a에 히라가나 버전이 들어가야 함", () => {
    const artist = {
      id: 1,
      name: "ガラクタ", // 카타카나
      nameKo: "가라쿠타",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ja_kana_p).toContain("ガラクタ"); // 카타카나 원본
    expect(result.q_name_ja_kana_a).toContain("がらくた"); // 히라가나 변환
    expect(result.nameJaKana).toBe("ガラクタ");
    expect(result.nameJaKanji).toBeUndefined(); // 한자 아님
  });

  it("한자 아티스트명은 ja_kanji_p에 들어가야 함", () => {
    const artist = {
      id: 2,
      name: "夜遊び", // 한자
      nameKo: "요아소비",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ja_kanji_p).toContain("夜遊び"); // 한자
    expect(result.nameJaKanji).toBe("夜遊び");
    expect(result.nameJaKana).toBeUndefined(); // 가나 아님
  });

  it("히라가나 아티스트명은 ja_kana_p에 들어가야 함 (변환 없음)", () => {
    const artist = {
      id: 3,
      name: "ゆず", // 히라가나
      nameKo: "유즈",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ja_kana_p).toContain("ゆず"); // 히라가나 원본
    expect(result.nameJaKana).toBe("ゆず");
    expect(result.nameJaKanji).toBeUndefined();
  });

  it("한자+가나 혼합은 ja_kanji_p에 들어가야 함", () => {
    const artist = {
      id: 4,
      name: "米津玄師", // 한자+히라가나
      nameKo: "요네즈 켄시",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ja_kanji_p).toContain("米津玄師"); // 한자 포함
    expect(result.nameJaKanji).toBe("米津玄師");
  });
});

describe("transformArtistToDocument", () => {
  it("기본 이름들이 검색 필드에 추가되어야 함", () => {
    const artist = {
      id: 1,
      name: "YOASOBI",
      nameKo: "요아소비",
      homeCatalog: "JPOP",
      aliases: [
        {
          alias: "夜遊び",
          locale: "JA_KANJI",
          kind: "SPOTIFY",
          source: "SPOTIFY",
        },
      ],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: { popularity: 85 },
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.id).toBe("1");
    expect(result.nameKo).toBe("요아소비");
    expect(result.q_name_ko_p).toContain("요아소비"); // 기본 이름 포함
    expect(result.popularity).toBe(85);
  });

  it("별칭이 없어도 기본 이름으로 검색 가능해야 함", () => {
    const artist = {
      id: 1,
      name: "ガラクタ",
      nameKo: "가라쿠타",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ko_p).toEqual(["가라쿠타"]);
    expect(result.q_name_ko_a).toEqual(["가라쿠타"]); // 원본도 _a에 포함
    expect(result.q_name_ja_kana_p).toEqual(["ガラクタ"]);
    // 원본(ガラクタ) + 히라가나 변환(がらくた)
    expect(result.q_name_ja_kana_a).toContain("ガラクタ");
    expect(result.q_name_ja_kana_a).toContain("がらくた");
  });

  it("별칭과 기본 이름이 모두 포함되어야 함", () => {
    const artist = {
      id: 1,
      name: "ガラクタ",
      nameKo: "가라쿠타",
      homeCatalog: "JPOP",
      aliases: [
        {
          alias: "쓰레기",
          locale: "KO",
          kind: "TRANSLATION",
          source: "MANUAL",
        },
      ],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ko_p).toContain("가라쿠타"); // 기본 이름
    expect(result.q_name_ko_a).toContain("쓰레기"); // 별칭
  });
});

describe("removeBrackets - Artist", () => {
  it("『유이카』 검색 시 원본과 괄호 제거 버전이 모두 q_name_ko_a에 들어가야 함", () => {
    const artist = {
      id: 189,
      name: "『ユイカ』",
      nameKo: "『유이카』",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    // 원본 포함
    expect(result.q_name_ko_a).toContain("『유이카』");
    // 괄호 제거 버전 포함
    expect(result.q_name_ko_a).toContain("유이카");

    // 일본어(가나)도 마찬가지
    expect(result.q_name_ja_kana_a).toContain("『ユイカ』");
    expect(result.q_name_ja_kana_a).toContain("ユイカ");
    // 히라가나 변환 버전들도 포함
    expect(result.q_name_ja_kana_a).toContain("『ゆいか』");
    expect(result.q_name_ja_kana_a).toContain("ゆいか");
  });

  it("괄호가 없는 아티스트는 원본만 들어가야 함", () => {
    const artist = {
      id: 1,
      name: "YOASOBI",
      nameKo: "요아소비",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    // 원본만 들어감 (중복 없음)
    expect(result.q_name_ko_a).toEqual(["요아소비"]);
  });

  it("다양한 괄호 종류를 제거해야 함", () => {
    const artist = {
      id: 1,
      name: "(test)",
      nameKo: "【테스트】",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ko_a).toContain("【테스트】");
    expect(result.q_name_ko_a).toContain("테스트");
  });

  it("한자 이름에 괄호가 있으면 원본과 제거 버전 모두 포함", () => {
    const artist = {
      id: 1,
      name: "『夜遊び』",
      nameKo: "요아소비",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    expect(result.q_name_ja_kanji_a).toContain("『夜遊び』");
    expect(result.q_name_ja_kanji_a).toContain("夜遊び");
  });
});

describe("removeBrackets - Song", () => {
  it("곡의 아티스트 이름에 괄호가 있으면 원본과 제거 버전 모두 포함", () => {
    const song = {
      id: 1,
      title: "사랑을 하고 있는 것 같아",
      titleKo: "사랑을 하고 있는 것 같아",
      catalog: "JPOP",
      aliases: [],
      artistSongs: [
        {
          artist: {
            id: 189,
            name: "『ユイカ』",
            nameKo: "『유이카』",
            aliases: [],
            spotifyArtist: null,
          },
        },
      ],
      karaokeSongs: [],
      updatedAt: new Date("2025-01-01"),
      spotifyTrack: null,
    };

    const result = transformSongToDocument(song as any);

    // 아티스트 한국어 이름: 원본 + 괄호 제거
    expect(result.q_artist_ko_a).toContain("『유이카』");
    expect(result.q_artist_ko_a).toContain("유이카");

    // 아티스트 일본어 이름: 원본 + 괄호 제거 + 히라가나 변환
    expect(result.q_artist_ja_kana_a).toContain("『ユイカ』");
    expect(result.q_artist_ja_kana_a).toContain("ユイカ");
    expect(result.q_artist_ja_kana_a).toContain("『ゆいか』");
    expect(result.q_artist_ja_kana_a).toContain("ゆいか");
  });

  it("여러 아티스트가 있으면 각각의 원본과 괄호 제거 버전이 모두 포함", () => {
    const song = {
      id: 1,
      title: "콜라보",
      titleKo: "콜라보",
      catalog: "JPOP",
      aliases: [],
      artistSongs: [
        {
          artist: {
            id: 1,
            name: "『ユイカ』",
            nameKo: "『유이카』",
            aliases: [],
            spotifyArtist: null,
          },
        },
        {
          artist: {
            id: 2,
            name: "YOASOBI",
            nameKo: "요아소비",
            aliases: [],
            spotifyArtist: null,
          },
        },
      ],
      karaokeSongs: [],
      updatedAt: new Date("2025-01-01"),
      spotifyTrack: null,
    };

    const result = transformSongToDocument(song as any);

    // 유이카 (괄호 있음)
    expect(result.q_artist_ko_a).toContain("『유이카』");
    expect(result.q_artist_ko_a).toContain("유이카");

    // 요아소비 (괄호 없음)
    expect(result.q_artist_ko_a).toContain("요아소비");
  });

  it("hasKaraokeNo가 노래방 번호 유무에 따라 설정되어야 함", () => {
    const songWithKaraoke = {
      id: 1,
      title: "테스트",
      titleKo: "테스트",
      catalog: "JPOP",
      aliases: [],
      artistSongs: [
        {
          artist: {
            id: 1,
            name: "아티스트",
            nameKo: "아티스트",
            aliases: [],
            spotifyArtist: null,
          },
        },
      ],
      karaokeSongs: [
        { provider: "TJ", karaokeNo: "12345" },
      ],
      updatedAt: new Date("2025-01-01"),
      spotifyTrack: null,
    };

    const songWithoutKaraoke = {
      ...songWithKaraoke,
      id: 2,
      karaokeSongs: [],
    };

    const resultWithKaraoke = transformSongToDocument(songWithKaraoke as any);
    const resultWithoutKaraoke = transformSongToDocument(songWithoutKaraoke as any);

    expect(resultWithKaraoke.hasKaraokeNo).toBe(true);
    expect(resultWithoutKaraoke.hasKaraokeNo).toBeUndefined();
  });
});

describe("혼합 가나 처리 - Artist", () => {
  it("히라가나+카타카나 혼합 아티스트명은 전부 히라가나/전부 카타카나 버전이 모두 포함되어야 함", () => {
    const artist = {
      id: 1,
      name: "ひらガナ", // 히라가나 + 카타카나 혼합
      nameKo: "히라가나",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    // Primary: 원본
    expect(result.q_name_ja_kana_p).toContain("ひらガナ");

    // Alias: 원본 + 전부 히라가나 + 전부 카타카나
    expect(result.q_name_ja_kana_a).toContain("ひらガナ"); // 원본
    expect(result.q_name_ja_kana_a).toContain("ひらがな"); // 전부 히라가나
    expect(result.q_name_ja_kana_a).toContain("ヒラガナ"); // 전부 카타카나
  });

  it("괄호가 있는 혼합 가나도 처리되어야 함", () => {
    const artist = {
      id: 1,
      name: "『ひらガナ』",
      nameKo: "히라가나",
      homeCatalog: "JPOP",
      aliases: [],
      updatedAt: new Date("2025-01-01"),
      spotifyArtist: null,
    };

    const result = transformArtistToDocument(artist as any);

    // 원본들
    expect(result.q_name_ja_kana_a).toContain("『ひらガナ』");
    expect(result.q_name_ja_kana_a).toContain("ひらガナ"); // 괄호 제거

    // 원본의 변환 버전들
    expect(result.q_name_ja_kana_a).toContain("『ひらがな』"); // 원본 전부 히라가나
    expect(result.q_name_ja_kana_a).toContain("『ヒラガナ』"); // 원본 전부 카타카나

    // 괄호 제거 버전의 변환들
    expect(result.q_name_ja_kana_a).toContain("ひらがな"); // 괄호 제거 + 전부 히라가나
    expect(result.q_name_ja_kana_a).toContain("ヒラガナ"); // 괄호 제거 + 전부 카타카나
  });
});

describe("혼합 가나 처리 - Song", () => {
  it("곡 제목이 혼합 가나면 전부 히라가나/전부 카타카나 버전이 모두 포함되어야 함", () => {
    const song = {
      id: 1,
      title: "테스트",
      titleKo: "히라가나",
      catalog: "JPOP",
      aliases: [
        {
          alias: "ひらガナ", // 혼합 가나
          locale: "JA_KANA",
          kind: "SPOTIFY",
          source: "SPOTIFY",
        },
      ],
      artistSongs: [
        {
          artist: {
            id: 1,
            name: "아티스트",
            nameKo: "아티스트",
            aliases: [],
            spotifyArtist: null,
          },
        },
      ],
      karaokeSongs: [],
      updatedAt: new Date("2025-01-01"),
      spotifyTrack: null,
    };

    const result = transformSongToDocument(song as any);

    // Primary: 원본
    expect(result.q_song_ja_kana_p).toContain("ひらガナ");

    // Alias: 전부 히라가나 + 전부 카타카나
    expect(result.q_song_ja_kana_a).toContain("ひらがな"); // 전부 히라가나
    expect(result.q_song_ja_kana_a).toContain("ヒラガナ"); // 전부 카타카나
  });

  it("곡의 아티스트가 혼합 가나면 전부 히라가나/전부 카타카나 버전이 모두 포함되어야 함", () => {
    const song = {
      id: 1,
      title: "테스트",
      titleKo: "테스트",
      catalog: "JPOP",
      aliases: [],
      artistSongs: [
        {
          artist: {
            id: 1,
            name: "ひらガナ", // 혼합 가나
            nameKo: "히라가나",
            aliases: [],
            spotifyArtist: null,
          },
        },
      ],
      karaokeSongs: [],
      updatedAt: new Date("2025-01-01"),
      spotifyTrack: null,
    };

    const result = transformSongToDocument(song as any);

    // 아티스트 이름: 원본 + 전부 히라가나 + 전부 카타카나
    expect(result.q_artist_ja_kana_a).toContain("ひらガナ"); // 원본
    expect(result.q_artist_ja_kana_a).toContain("ひらがな"); // 전부 히라가나
    expect(result.q_artist_ja_kana_a).toContain("ヒラガナ"); // 전부 카타카나
  });
});
