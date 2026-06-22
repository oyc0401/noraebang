import { normalizeTitle } from "./normalizer";

// pnpm test normalizer.spec.ts

describe("normalizeTitle", () => {
  describe("기본 정규화 (공백/괄호/하이픈/대소문자)", () => {
    it("공백을 제거해야 함", () => {
      expect(normalizeTitle("Love Letter")).toBe("loveletter");
    });

    it("하이픈을 제거해야 함", () => {
      expect(normalizeTitle("Love-Letter")).toBe("loveletter");
    });

    it("언더스코어를 제거해야 함", () => {
      expect(normalizeTitle("Love_Letter")).toBe("loveletter");
    });

    it("괄호를 제거해야 함", () => {
      expect(normalizeTitle("Love (Letter)")).toBe("love");
      expect(normalizeTitle("Love [Letter]")).toBe("love");
      expect(normalizeTitle("Love {Letter}")).toBe("love");
    });

    it("대문자를 소문자로 변환해야 함", () => {
      expect(normalizeTitle("YOASOBI")).toBe("yoasobi");
      expect(normalizeTitle("YoAoSoBi")).toBe("yoaosobi");
    });

    it("복합 패턴도 정규화해야 함", () => {
      expect(normalizeTitle("Love-Letter (Original)")).toBe("loveletter");
    });
  });

  describe("라이브 버전 패턴 제거", () => {
    it("- Live를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける - Live")).toBe("夜に駆ける");
    });

    it("(Live)를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける (Live)")).toBe("夜に駆ける");
    });

    it("[Live]를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける [Live]")).toBe("夜に駆ける");
    });

    it("- Live at ~를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける - Live at Tokyo")).toBe("夜に駆ける");
    });

    it("(Live at ~)를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける (Live at Tokyo Dome)")).toBe(
        "夜に駆ける",
      );
    });

    it("Live ver.을 제거해야 함", () => {
      expect(normalizeTitle("脳裏上のクラッカー Live ver.")).toBe(
        "脳裏上のクラッカー",
      );
    });

    it("-We will B- Live ver.를 제거해야 함 (일본 곡)", () => {
      expect(normalizeTitle("惑う星 -We will B- Live ver.")).toBe("惑う星");
    });

    it("/ LIVE 패턴도 제거해야 함", () => {
      expect(normalizeTitle("脳裏上のクラッカー / LIVE")).toBe(
        "脳裏上のクラッカー",
      );
    });
  });

  describe("인스트루멘탈 패턴 제거", () => {
    it("- Instrumental을 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける - Instrumental")).toBe("夜に駆ける");
    });

    it("(Instrumental)을 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける (Instrumental)")).toBe("夜に駆ける");
    });

    it("[Instrumental]을 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける [Instrumental]")).toBe("夜に駆ける");
    });

    it("- Inst.를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける - Inst.")).toBe("夜に駆ける");
    });

    it("(Inst.)를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける (Inst.)")).toBe("夜に駆ける");
    });

    it("-instrumental- 패턴도 제거해야 함 (일본 곡)", () => {
      expect(normalizeTitle("青い春と西の空-instrumental-")).toBe(
        "青い春と西の空",
      );
    });
  });

  describe("리믹스 패턴 제거", () => {
    it("- Remix를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける - Remix")).toBe("夜に駆ける");
    });

    it("(Remix)를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける (Remix)")).toBe("夜に駆ける");
    });

    it("- XX Remix를 제거해야 함", () => {
      expect(normalizeTitle("UCHIDA1 - Laos Remix")).toBe("uchida1");
      expect(normalizeTitle("ブループリント - Sasuke Haraguchi Remix")).toBe(
        "ブループリント",
      );
    });

    it("(XX Remix)를 제거해야 함", () => {
      expect(normalizeTitle("夜に駆ける (Electronic Remix)")).toBe(
        "夜に駆ける",
      );
    });

    it("- XX Mix를 제거해야 함", () => {
      expect(normalizeTitle("Song Title - 30th Anniversary Mix")).toBe(
        "songtitle",
      );
    });
  });

  describe("버전 표시 패턴 제거", () => {
    it("(alt ver.)를 제거해야 함", () => {
      expect(normalizeTitle("Ohayou Culture (alt ver.)")).toBe("ohayouculture");
    });

    it("(Ver.)를 제거해야 함", () => {
      expect(normalizeTitle("Song Title (Ver.)")).toBe("songtitle");
    });

    it("(Version)을 제거해야 함", () => {
      expect(normalizeTitle("Song Title (Version)")).toBe("songtitle");
    });

    it("- Alternate Version을 제거해야 함", () => {
      expect(normalizeTitle("Song Title - Alternate Version")).toBe(
        "songtitle",
      );
    });

    it("- XX Ver.를 제거해야 함 (일본 곡)", () => {
      expect(normalizeTitle("リードコントロール - せっかち Ver.")).toBe(
        "リードコントロール",
      );
    });
  });

  describe("보컬 제거 패턴 제거", () => {
    it("- OFF VOCAL을 제거해야 함", () => {
      expect(normalizeTitle("Treasure Pleasure - OFF VOCAL")).toBe(
        "treasurepleasure",
      );
    });

    it("(OFF VOCAL)을 제거해야 함", () => {
      expect(normalizeTitle("Song Title (OFF VOCAL)")).toBe("songtitle");
    });

    it("[OFF VOCAL]을 제거해야 함", () => {
      expect(normalizeTitle("Song Title [OFF VOCAL]")).toBe("songtitle");
    });

    it("대소문자 구분 없이 제거해야 함", () => {
      expect(normalizeTitle("Song Title - Off Vocal")).toBe("songtitle");
      expect(normalizeTitle("Song Title - off vocal")).toBe("songtitle");
    });
  });

  describe("출처 표시 패턴 제거", () => {
    it("- from ~을 제거해야 함", () => {
      expect(normalizeTitle('Infinite Love - from "Rodeo Note" vol.1')).toBe(
        "infinitelove",
      );
    });

    it("(from ~)을 제거해야 함", () => {
      expect(normalizeTitle("Song Title (from Album Name)")).toBe("songtitle");
    });

    it("[from ~]을 제거해야 함", () => {
      expect(normalizeTitle("Song Title [from Movie]")).toBe("songtitle");
    });
  });

  describe("특별 편곡 패턴 제거", () => {
    it("[with ~]을 제거해야 함", () => {
      expect(normalizeTitle("Endless Summer [with FIRE HORNS]")).toBe(
        "endlesssummer",
      );
    });

    it("(with ~)을 제거해야 함", () => {
      expect(normalizeTitle("Song Title (with Orchestra)")).toBe("songtitle");
    });

    it("- with ~을 제거해야 함", () => {
      expect(normalizeTitle("Song Title - with Strings")).toBe("songtitle");
    });
  });

  describe("짧은 버전 패턴 제거", () => {
    it("- TV Size를 제거해야 함", () => {
      expect(normalizeTitle("UNFAIR - TV Size")).toBe("unfair");
    });

    it("(TV Size)를 제거해야 함", () => {
      expect(normalizeTitle("Song Title (TV Size)")).toBe("songtitle");
    });

    it("[TV Size]를 제거해야 함", () => {
      expect(normalizeTitle("Song Title [TV Size]")).toBe("songtitle");
    });

    it("- Short Ver.를 제거해야 함", () => {
      expect(normalizeTitle("Song Title - Short Ver.")).toBe("songtitle");
    });

    it("(Short Ver.)를 제거해야 함", () => {
      expect(normalizeTitle("Song Title (Short Ver.)")).toBe("songtitle");
    });

    it("- Radio Edit를 제거해야 함", () => {
      expect(normalizeTitle("Song Title - Radio Edit")).toBe("songtitle");
    });

    it("(Radio Edit)를 제거해야 함", () => {
      expect(normalizeTitle("Song Title (Radio Edit)")).toBe("songtitle");
    });
  });

  describe("재녹음/재발매 패턴 제거", () => {
    it("(Re:~)를 제거해야 함", () => {
      expect(normalizeTitle("Song Title (Re:2024)")).toBe("songtitle");
    });

    it("(Re：~)를 제거해야 함 (전각 콜론)", () => {
      expect(normalizeTitle("Song Title (Re：Recording)")).toBe("songtitle");
    });

    it("（Re:~）를 제거해야 함 (전각 괄호)", () => {
      expect(normalizeTitle("Song Title（Re:Master）")).toBe("songtitle");
    });
  });

  describe("복합 패턴", () => {
    it("여러 패턴이 섞여있어도 모두 제거해야 함", () => {
      expect(normalizeTitle("phoenix - (Instrumental) [Live]")).toBe("phoenix");
    });

    it("복잡한 라이브 타이틀도 정규화해야 함", () => {
      expect(
        normalizeTitle(
          "脳裏上のクラッカー - 本格中華喫茶・愛のペガサス ~羅武の香辛龍~ 2024 / LIVE",
        ),
      ).toBe("脳裏上のクラッカー本格中華喫茶愛のペガサス羅武の香辛龍2024");
    });
  });

  describe("실제 매칭 시나리오", () => {
    it("원본과 라이브 버전이 같은 제목으로 정규화되어야 함", () => {
      const original = normalizeTitle("夜に駆ける");
      const live = normalizeTitle("夜に駆ける - Live");
      const instrumental = normalizeTitle("夜に駆ける - Instrumental");

      expect(original).toBe(live);
      expect(original).toBe(instrumental);
      expect(live).toBe(instrumental);
    });

    it("공백/하이픈 차이가 있어도 같은 제목으로 정규화되어야 함", () => {
      const space = normalizeTitle("Love Letter");
      const hyphen = normalizeTitle("Love-Letter");
      const underscore = normalizeTitle("Love_Letter");

      expect(space).toBe(hyphen);
      expect(space).toBe(underscore);
      expect(hyphen).toBe(underscore);
    });

    it("대소문자 차이가 있어도 같은 제목으로 정규화되어야 함", () => {
      const upper = normalizeTitle("YOASOBI");
      const lower = normalizeTitle("yoasobi");

      expect(upper).toBe(lower);
      expect(upper).toBe("yoasobi");
      expect(lower).toBe("yoasobi");
    });
  });

  describe("엣지 케이스", () => {
    it("빈 문자열은 빈 문자열을 반환해야 함", () => {
      expect(normalizeTitle("")).toBe("");
    });

    it("공백만 있는 문자열은 빈 문자열을 반환해야 함", () => {
      expect(normalizeTitle("   ")).toBe("");
    });

    it("패턴만 있는 문자열은 빈 문자열을 반환해야 함", () => {
      expect(normalizeTitle("- Live")).toBe("");
      expect(normalizeTitle("(Remix)")).toBe("");
    });

    it("한글 제목도 정규화되어야 함", () => {
      expect(normalizeTitle("사랑해 - Live")).toBe("사랑해");
      expect(normalizeTitle("사랑 해")).toBe("사랑해");
    });

    it("중국어 제목도 정규화되어야 함", () => {
      expect(normalizeTitle("爱你 - Live")).toBe("爱你");
      expect(normalizeTitle("爱 你")).toBe("爱你");
    });
  });
});
