import { normalizeBasic, removePunctuation, removeSpaces } from "./text-utils";

describe("text-utils", () => {
  describe("removeSpaces", () => {
    it("모든 공백을 제거해야 함", () => {
      expect(removeSpaces("YOA SOBI")).toBe("YOASOBI");
      expect(removeSpaces("  여 기  스 페 이 스  ")).toBe("여기스페이스");
      expect(removeSpaces("멀티\n라인\t공백")).toBe("멀티라인공백");
    });
  });

  describe("removePunctuation", () => {
    it("특수문자를 공백으로 치환하고 공백을 정리해야 함", () => {
      expect(removePunctuation("YOA-SOBI!!")).toBe("YOA SOBI");
      expect(removePunctuation("밤을! 달리다???")).toBe("밤을 달리다");
      expect(removePunctuation("Good   bye-bye")).toBe("Good bye bye");
    });

    it("구두점, 일본어 괄호도 제거해야함", () => {
      expect(removePunctuation("YOA SOBI。")).toBe("YOA SOBI");
      expect(removePunctuation(" 『ユイカ』")).toBe("ユイカ");
    });

    it("문자와 숫자만 있을 때는 그대로 반환해야 함", () => {
      expect(removePunctuation("테스트123")).toBe("테스트123");
    });
  });

  describe("normalizeBasic", () => {
    it("특수문자와 공백이 모두 제거된 문자열을 반환해야 함", () => {
      expect(normalizeBasic(" 밤 을- 달리다! ")).toBe("밤을달리다");
      expect(normalizeBasic("YOA SOBI!!")).toBe("YOASOBI");
    });

    it("이미 정리된 문자열은 그대로 반환해야 함", () => {
      expect(normalizeBasic("테스트")).toBe("테스트");
    });
  });
});
