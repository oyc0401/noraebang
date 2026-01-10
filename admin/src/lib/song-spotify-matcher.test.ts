/**
 * Song-Spotify 매칭 알고리즘 테스트
 */

import { findBestMatch } from "./song-spotify-matcher";

describe("findBestMatch", () => {
  describe("완전 일치", () => {
    it("제목이 완전히 같으면 매칭되어야 함", () => {
      const result = findBestMatch("唱", ["唱", "Show", "Shoka"]);
      expect(result).toBe("唱");
    });

    it("영어 제목 완전 일치", () => {
      const result = findBestMatch("ROCKSTAR", [
        "ROCKSTAR",
        "Rockstar",
        "Rock Star",
      ]);
      expect(result).toBe("ROCKSTAR");
    });
  });

  describe("띄어쓰기 차이", () => {
    it("띄어쓰기가 있어도 매칭되어야 함", () => {
      const result = findBestMatch("ウタカタララバイ", [
        "ウタカタ ララバイ",
        "Utakata Lullaby",
        "Other Song",
      ]);
      expect(result).toBe("ウタカタ ララバイ");
    });

    it("여러 띄어쓰기 차이", () => {
      const result = findBestMatch("脳裏上のクラッカー", [
        "脳裏 上の クラッカー",
        "Nouriueno Cracker",
        "Other",
      ]);
      expect(result).toBe("脳裏 上の クラッカー");
    });
  });

  describe("괄호 및 부가정보", () => {
    it("괄호가 있어도 매칭되어야 함", () => {
      const result = findBestMatch("ウタカタララバイ", [
        "ウタカタララバイ(from TVShow!!)",
        "Utakata",
        "Other",
      ]);
      expect(result).toBe("ウタカタララバイ(from TVShow!!)");
    });

    it("대괄호 버전 표시", () => {
      const result = findBestMatch("唱", [
        "唱 [Official Music Video]",
        "Show",
        "Shoka",
      ]);
      expect(result).toBe("唱 [Official Music Video]");
    });

    it("하이픈 버전 표시", () => {
      const result = findBestMatch("唱", [
        "唱 - Live Version",
        "Show",
        "Other",
      ]);
      expect(result).toBe("唱 - Live Version");
    });
  });

  describe("숫자 차이", () => {
    it("숫자가 포함되어 차이가 크면 null", () => {
      const result = findBestMatch("ウタカタララバイ", [
        "ウタカタ ラ3バイ",
        "Utakata",
        "Other",
      ]);
      expect(result).toBe(null);
    });

    it("연도 표시", () => {
      const result = findBestMatch("十戒", ["十戒 (1984)", "十戒", "Other"]);
      // 둘 다 높은 점수지만 정확히 같은 것 선택
      expect(["十戒 (1984)", "十戒"]).toContain(result);
    });
  });

  describe("협업 표시 (feat/with)", () => {
    it("with가 있어도 매칭되어야 함", () => {
      const result = findBestMatch("ウタカタララバイ", [
        "ウタカタララバイwithChoci and aimyon",
        "Utakata",
        "Other",
      ]);
      expect(result).toBe("ウタカタララバイwithChoci and aimyon");
    });

    it("feat가 있어도 매칭되어야 함", () => {
      const result = findBestMatch("桜日和とタイムマシン", [
        "桜日和とタイムマシン with 初音ミク",
        "Sakura Biyori",
        "Other",
      ]);
      expect(result).toBe("桜日和とタイムマシン with 初音ミク");
    });
  });

  describe("유사한 문자", () => {
    it("가타카나 vs 히라가나 (다른 문자 취급)", () => {
      const result = findBestMatch("ウタカタ", [
        "うたかた",
        "Utakata",
        "Other",
      ]);
      // 완전 다른 문자이므로 유사도 낮을 수 있음
      // 하지만 다른 것보다는 높아야 함
      expect(result).toBe(null);
    });
  });

  describe("로마자/영어 제목", () => {
    it("일본어 vs 로마자 (완전히 다르면 null)", () => {
      const result = findBestMatch("脳裏上のクラッカー", [
        "Nouriueno Cracker",
        "Other Song",
        "Another",
      ]);
      expect(result).toBe(null);
    });

    it("영어 제목끼리 매칭", () => {
      const result = findBestMatch("ROCKSTAR", [
        "ROCKSTAR",
        "Rock Star",
        "Rockstar",
      ]);
      expect(result).toBe("ROCKSTAR");
    });
  });

  describe("엣지 케이스", () => {
    it("후보가 1개만 있으면 그것을 반환", () => {
      const result = findBestMatch("唱", ["唱"]);
      expect(result).toBe("唱");
    });

    it("완전히 다른 제목들만 있으면 null 반환", () => {
      const result = findBestMatch("唱", ["ZZZZZ", "YYYYY", "XXXXX"]);
      expect(result).toBe(null);
    });

    it("유사도가 낮으면 null 반환", () => {
      const result = findBestMatch("唱", ["", "Show", "Shoka"]);
      expect(result).toBe(null);
    });
  });

  describe("실제 케이스", () => {
    it("Ado - 唱 매칭", () => {
      const result = findBestMatch("唱", [
        "Shoka",
        "Show",
        "唱 - Stripped",
        "唱 - Slowed Down",
        "Other Song",
      ]);
      expect(["唱 - Stripped", "唱 - Slowed Down"]).toContain(result);
    });

    it("Ado - 新時代 매칭", () => {
      const result = findBestMatch("新時代", [
        "New Genesis",
        "新時代 - ウタ from ONE PIECE FILM RED",
        "Shinjidai",
        "Other",
      ]);
      expect(result).toBe("新時代 - ウタ from ONE PIECE FILM RED");
    });

    it("Ado - 脳裏上のクラッカー 매칭", () => {
      const result = findBestMatch("脳裏上のクラッカー", [
        "Nouriueno Cracker",
        "脳裏上のクラッカー",
        "Other",
      ]);
      expect(result).toBe("脳裏上のクラッカー");
    });
  });
});
