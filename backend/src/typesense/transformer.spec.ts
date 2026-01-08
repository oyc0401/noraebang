// pnpm test transformer.spec.ts
//
// Typesense transformer 유틸리티 함수 테스트

import { transformArtistToDocument } from "./transformer";

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
    expect(result.q_name_ja_kana_p).toEqual(["ガラクタ"]);
    expect(result.q_name_ja_kana_a).toEqual(["がらくた"]);
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
