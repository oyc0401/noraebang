/**
 * Song-Spotify 매칭 알고리즘 테스트
 *
 * 정책(테스트가 강제하는 의미)
 * - answer: 자동 확정된 최종 매칭 결과. 확신이 없으면 null.
 * - candidate: “근접 후보” 목록(사람 검토/디버깅용).
 *   - answer가 존재하더라도 candidate가 존재할 수 있음(근접한 다른 후보).
 *   - 어떤 케이스에서는 candidate가 “원래는 정답이었을 수 있는 항목”이지만,
 *     더 유사도가 높은 항목이 존재해서 answer에서 밀려난 것일 수 있음.
 *     (예: "十戒" vs "十戒 (1984)" — "十戒"이 없었다면 "(1984)"가 answer였을 가능성)
 *
 * 주의(의도된 예외)
 * - 아래 “Ado - 唱” 케이스는 어떤 변형(Stripped/Slowed Down)이 answer가 될지
 *   테스트 단계에서 고정하지 않기 위해, answer 및 candidate를 “둘 중 하나” 방식으로 검증한다.
 *   또한, answer가 candidate로 올라오는 일은 없다는 전제로 두었다(다른 케이스에서 잡힌다).
 */

import { findBestMatch } from "./song-spotify-matcher";

describe("findBestMatch", () => {
  describe("완전 일치", () => {
    it("제목이 완전히 같으면 매칭되어야 함", () => {
      const result = findBestMatch("唱", ["唱", "Show", "Shoka"]);
      expect(result.answer).toBe("唱");
      expect(result.candidate).toEqual([]);
    });

    it("정답이 있어도 후보는 있어야함.", () => {
      const result = findBestMatch("唱", ["唱", "唱32", "Shoka"]);
      expect(result.answer).toBe("唱");
      expect(result.candidate).toEqual(["唱32"]);
    });

    it("후보가 있더라도 정답이 없을 수 있음", () => {
      const result = findBestMatch("唱", ["唱32", "Shoka"]);
      expect(result.answer).toBe(null);
      expect(result.candidate).toEqual(["唱32"]);
    });

    it("영어 제목 완전 일치 (표기 변형 후보군도 반환)", () => {
      const result = findBestMatch("ROCKSTAR", [
        "ROCKSTAR",
        "Rockstar",
        "Rock Star",
      ]);
      expect(result.answer).toBe("ROCKSTAR");
      expect(result.candidate).toEqual(["Rockstar", "Rock Star"]);
    });
  });

  describe("띄어쓰기 차이", () => {
    it("띄어쓰기가 있어도 매칭되어야 함)", () => {
      const result = findBestMatch("ウタカタララバイ", [
        "ウタカタ ララバイ",
        "Uタララバイaby",
        "Oウタカタララバイg",
      ]);
      expect(result.answer).toBe("ウタカタ ララバイ");
      expect(result.candidate).toEqual(["Oウタカタララバイg"]);
    });

    it("여러 띄어쓰기 차이", () => {
      const result = findBestMatch("脳裏上のクラッカー", [
        "脳裏 上の クラッカー",
        "カー",
        "脳裏上の",
      ]);
      expect(result.answer).toBe("脳裏 上の クラッカー");
      expect(result.candidate).toEqual([]);
    });
  });

  describe("괄호 및 부가정보", () => {
    it("괄호가 있어도 매칭되어야 함", () => {
      const result = findBestMatch("ウタカタララバイ", [
        "ウタカタララバイ(from TVShow!!)",
        "ウタカ バイ",
        "ウタカ",
      ]);
      expect(result.answer).toBe("ウタカタララバイ(from TVShow!!)");
      expect(result.candidate).toEqual([]);
    });

    it("대괄호 버전 표시", () => {
      const result = findBestMatch("唱", [
        "唱 [Official Music Video]",
        "唱唱唱唱",
        "Other 唱",
      ]);
      expect(result.answer).toBe("唱 [Official Music Video]");
      // 순서 강제 의도 없음: 두 개가 후보면 OK
      expect(result.candidate).toHaveLength(2);
      expect(result.candidate).toEqual(
        expect.arrayContaining(["Other 唱", "唱唱唱唱"]),
      );
    });

    it("하이픈 버전 표시", () => {
      const result = findBestMatch("唱", [
        "唱 - Live Version",
        "唱唱唱唱唱",
        "Other 唱",
      ]);
      expect(result.answer).toBe("唱 - Live Version");
      // 순서 강제 의도 없음: 두 개가 후보면 OK
      expect(result.candidate).toHaveLength(2);
      expect(result.candidate).toEqual(
        expect.arrayContaining(["Other 唱", "唱唱唱唱唱"]),
      );
    });
  });

  describe("숫자 차이", () => {
    it("연도 표시", () => {
      const result = findBestMatch("十戒", ["十戒 (1984)", "十戒", "Other"]);
      expect(result.answer).toBe("十戒");
      expect(result.candidate).toEqual(["十戒 (1984)"]);
    });
  });

  describe("협업 표시 (feat/with)", () => {
    it("with가 있어도 매칭되어야 함", () => {
      const result = findBestMatch("ウタカタララバイ", [
        "ウタカタララバイ with Choci and aimyon",
        "ウタカタララバ",
        "ウ",
      ]);
      expect(result.answer).toBe("ウタカタララバイ with Choci and aimyon");
      expect(result.candidate).toEqual([]);
    });

    it("feat/with가 있어도 매칭되어야 함", () => {
      const result = findBestMatch("桜日和とタイムマシン", [
        "桜日和とタイムマシン with 初音ミク",
        "Sakura Biyori",
        "Other",
      ]);
      expect(result.answer).toBe("桜日和とタイムマシン with 初音ミク");
      expect(result.candidate).toEqual([]);
    });
  });

  describe("문자열 매핑 실패사례", () => {
    it("가타카나 vs 히라가나 (다른 문자 취급)", () => {
      const result = findBestMatch("ウタカタ", [
        "うたかた",
        "Utakata",
        "Other",
      ]);
      expect(result.answer).toBe(null);
      expect(result.candidate).toEqual([]);
    });

    it("차이가 크면 null + 후보군 1개", () => {
      const result = findBestMatch("ウタカタララバイ", [
        "ウタカタ ラババイ",
        "ララバ",
        "ウタ",
      ]);
      expect(result.answer).toBe(null);
      expect(result.candidate).toEqual(["ウタカタ ラババイ"]);
    });

    it("일본어 vs 로마자 (완전히 다르면 null)", () => {
      const result = findBestMatch("脳裏上のクラッカー", [
        "Nouriueno Cracker",
        "Other Song",
        "Another",
      ]);
      expect(result.answer).toBe(null);
      expect(result.candidate).toEqual([]);
    });
  });

  describe("엣지 케이스", () => {
    it("후보가 1개", () => {
      const result = findBestMatch("唱", ["唱"]);
      expect(result.answer).toBe("唱");
      expect(result.candidate).toEqual([]);
    });

    it("후보가 1개여도 다르면 null", () => {
      const result = findBestMatch("唱", ["dsadsa"]);
      expect(result.answer).toBe(null);
      expect(result.candidate).toEqual([]);
    });

    it("완전히 다른 제목들만 있으면 null 반환", () => {
      const result = findBestMatch("唱", ["ZZZZZ", "YYYYY", "XXXXX"]);
      expect(result.answer).toBe(null);
      expect(result.candidate).toEqual([]);
    });

    it("유사도가 낮으면 null 반환", () => {
      const result = findBestMatch("唱", ["", "Show", "Shoka"]);
      expect(result.answer).toBe(null);
      expect(result.candidate).toEqual([]);
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

      expect(["唱 - Stripped", "唱 - Slowed Down"]).toContain(result.answer);
      expect([["唱 - Stripped"], ["唱 - Slowed Down"]]).toContainEqual(
        result.candidate,
      );
    });

    it("Ado - 新時代 매칭", () => {
      const result = findBestMatch("新時代", [
        "New Genesis",
        "新時代 - ウタ from ONE PIECE FILM RED",
        "Shinjidai",
        "Other",
      ]);
      expect(result.answer).toBe("新時代 - ウタ from ONE PIECE FILM RED");
      expect(result.candidate).toEqual([]);
    });

    it("Ado - 脳裏上のクラッカー 매칭", () => {
      const result = findBestMatch("脳裏上のクラッカー", [
        "Nouriueno Cracker",
        "脳裏上のクラッカー",
        "Other",
      ]);
      expect(result.answer).toBe("脳裏上のクラッカー");
      expect(result.candidate).toEqual([]);
    });
  });

  describe("추가된 케이스", () => {
    it("Song:綺 이고, Spotify에는 '綺 - from you', '綺羅' 이면 전자를 선택", () => {
      const result = findBestMatch("綺", ["綺 - from you", "綺羅"]);
      expect(result.answer).toBe("綺 - from you");
      // 綺 는 너무 짧아서 오탐 위험 -> 후보군으로는 올리지 않음
      expect(result.candidate).toEqual([]);
    });
  });
});
