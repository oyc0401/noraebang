import { isDuplicateTrack } from "./duplicate-track-detector";

// pnpm test duplicate-track-detector.spec.ts

describe("isDuplicateTrack", () => {
  describe("정상 트랙 (중복 아님)", () => {
    it("일반 곡 제목은 중복이 아니어야 함", () => {
      expect(isDuplicateTrack("Like Crazy")).toBe(false);
    });

    it("공백만 있는 문자열은 중복이 아니어야 함", () => {
      expect(isDuplicateTrack("   ")).toBe(false);
    });

    it("빈 문자열은 중복이 아니어야 함", () => {
      expect(isDuplicateTrack("")).toBe(false);
    });
  });

  describe("버전 표시 패턴", () => {
    it("(alt ver.) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Like Crazy (alt ver.)")).toBe(true);
    });

    it("(Ver.) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Dynamite (Ver.)")).toBe(true);
    });

    it("(Version) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Butter (Version)")).toBe(true);
    });

    it("- Alternate Version 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Spring Day - Alternate Version")).toBe(true);
    });
  });

  describe("라이브 버전 패턴", () => {
    it("- Live 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("DNA - Live")).toBe(true);
    });

    it("(Live) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Mic Drop (Live)")).toBe(true);
    });

    it("- Live at 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Fire - Live at Seoul")).toBe(true);
    });

    it("(Live at ~) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Not Today (Live at Wembley)")).toBe(true);
    });
  });

  describe("인스트루멘탈 패턴", () => {
    it("- Instrumental 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Save ME - Instrumental")).toBe(true);
    });

    it("(Instrumental) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("I Need U (Instrumental)")).toBe(true);
    });

    it("- Inst. 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("RUN - Inst.")).toBe(true);
    });

    it("(Inst.) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Blood Sweat & Tears (Inst.)")).toBe(true);
    });
  });

  describe("리믹스 패턴", () => {
    it("- Remix 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Boy With Luv - Remix")).toBe(true);
    });

    it("(Remix) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Fake Love (Remix)")).toBe(true);
    });

    it("- XX Remix 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("ON - Electronic Remix")).toBe(true);
    });

    it("(XX Remix) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Black Swan (Orchestral Remix)")).toBe(true);
    });
  });

  describe("복합 패턴", () => {
    it("여러 패턴이 섞여있어도 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Dynamite - Live Remix Version")).toBe(true);
    });
  });

  describe("대소문자 구분 없음", () => {
    it("소문자 live도 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title - live")).toBe(true);
    });

    it("대문자 LIVE도 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title - LIVE")).toBe(true);
    });

    it("소문자 instrumental도 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title - instrumental")).toBe(true);
    });
  });

  describe("일본 곡 패턴", () => {
    it("Live ver. 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("惑う星 -We will B- Live ver.")).toBe(true);
    });

    it("Live ver. 패턴 (다른 예시)", () => {
      expect(isDuplicateTrack("なにが悪い -恒星- Live ver.")).toBe(true);
    });

    it("-instrumental- 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("青い春と西の空-instrumental-")).toBe(true);
    });
  });

  describe("보컬 제거 패턴", () => {
    it("- OFF VOCAL 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Treasure Pleasure - OFF VOCAL")).toBe(true);
    });

    it("(OFF VOCAL) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title (OFF VOCAL)")).toBe(true);
    });

    it("- Off Vocal 패턴 (대소문자 다름)", () => {
      expect(isDuplicateTrack("Song Title - Off Vocal")).toBe(true);
    });
  });

  describe("출처 표시 패턴", () => {
    it("- from 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack('Infinite Love - from "Rodeo Note" vol.1')).toBe(
        true,
      );
    });

    it("(from ~) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title (from Album Name)")).toBe(true);
    });
  });

  describe("특별 편곡 패턴", () => {
    it("[with ~] 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Endless Summer [with FIRE HORNS]")).toBe(true);
    });

    it("(with ~) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title (with Orchestra)")).toBe(true);
    });

    it("- with ~ 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title - with Strings")).toBe(true);
    });
  });

  describe("실제 데이터 예시 (사용자 제공 - 배치 1)", () => {
    it("残機 - Live", () => {
      expect(isDuplicateTrack("残機 - Live")).toBe(true);
    });

    it("惑う星 -We will B- Live ver.", () => {
      expect(isDuplicateTrack("惑う星 -We will B- Live ver.")).toBe(true);
    });

    it("なにが悪い -恒星- Live ver.", () => {
      expect(isDuplicateTrack("なにが悪い -恒星- Live ver.")).toBe(true);
    });

    it("青い春と西の空-instrumental-", () => {
      expect(isDuplicateTrack("青い春と西の空-instrumental-")).toBe(true);
    });

    it("Ohayou Culture (alt ver.)", () => {
      expect(isDuplicateTrack("Ohayou Culture (alt ver.)")).toBe(true);
    });

    it("phoenix - (Instrumental) [Live]", () => {
      expect(isDuplicateTrack("phoenix - (Instrumental) [Live]")).toBe(true);
    });

    it("Treasure Pleasure - OFF VOCAL", () => {
      expect(isDuplicateTrack("Treasure Pleasure - OFF VOCAL")).toBe(true);
    });

    it('Infinite Love - from "Rodeo Note" vol.1', () => {
      expect(isDuplicateTrack('Infinite Love - from "Rodeo Note" vol.1')).toBe(
        true,
      );
    });

    it("Endless Summer [with FIRE HORNS]", () => {
      expect(isDuplicateTrack("Endless Summer [with FIRE HORNS]")).toBe(true);
    });
  });

  describe("실제 데이터 예시 (사용자 제공 - 배치 2)", () => {
    it("SUNRISE - Remix", () => {
      expect(isDuplicateTrack("SUNRISE - Remix")).toBe(true);
    });

    it("UCHIDA1 - Laos Remix", () => {
      expect(isDuplicateTrack("UCHIDA1 - Laos Remix")).toBe(true);
    });

    it("UCHIDA 1 - Vietnam Remix", () => {
      expect(isDuplicateTrack("UCHIDA 1 - Vietnam Remix")).toBe(true);
    });

    it("ブループリント - Sasuke Haraguchi Remix", () => {
      expect(isDuplicateTrack("ブループリント - Sasuke Haraguchi Remix")).toBe(
        true,
      );
    });

    it("リードコントロール - せっかち Ver.", () => {
      expect(isDuplicateTrack("リードコントロール - せっかち Ver.")).toBe(true);
    });

    it("UNFAIR - TV Size", () => {
      expect(isDuplicateTrack("UNFAIR - TV Size")).toBe(true);
    });

    it("脳裏上のクラッカー - 本格中華喫茶・愛のペガサス ~羅武の香辛龍~ 2024 / LIVE", () => {
      expect(
        isDuplicateTrack(
          "脳裏上のクラッカー - 本格中華喫茶・愛のペガサス ~羅武の香辛龍~ 2024 / LIVE",
        ),
      ).toBe(true);
    });
  });

  describe("짧은 버전 패턴", () => {
    it("- TV Size 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title - TV Size")).toBe(true);
    });

    it("(TV Size) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title (TV Size)")).toBe(true);
    });

    it("- Short Ver. 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title - Short Ver.")).toBe(true);
    });

    it("- Radio Edit 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title - Radio Edit")).toBe(true);
    });

    it("(Radio Edit) 패턴은 중복으로 판단해야 함", () => {
      expect(isDuplicateTrack("Song Title (Radio Edit)")).toBe(true);
    });
  });
});
