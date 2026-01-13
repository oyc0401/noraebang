import {

  removeBrackets,

} from "./text-utils";

describe("text-utils", () => {
  describe("removeBrackets", () => {
    it("다양한 괄호를 제거해야 함", () => {
      expect(removeBrackets("『유이카』")).toBe("유이카");
      expect(removeBrackets("『ユイカ』")).toBe("ユイカ");
      expect(removeBrackets("(테스트)")).toBe("테스트");
      expect(removeBrackets("【YOASOBI】")).toBe("YOASOBI");
      expect(removeBrackets("［test］")).toBe("test");
      expect(removeBrackets("<test>")).toBe("test");
      expect(removeBrackets("《test》")).toBe("test");
      expect(removeBrackets("{test}")).toBe("test");
      expect(removeBrackets("（test）")).toBe("test");
      expect(removeBrackets("[test]")).toBe("test");
    });

    it("괄호가 없으면 원본을 반환해야 함", () => {
      expect(removeBrackets("YOASOBI")).toBe("YOASOBI");
      expect(removeBrackets("유이카")).toBe("유이카");
      expect(removeBrackets("test")).toBe("test");
    });

    it("빈 문자열을 처리해야 함", () => {
      expect(removeBrackets("")).toBe("");
    });

    it("여러 괄호가 섞여있어도 모두 제거해야 함", () => {
      expect(removeBrackets("『유이카』(YUIKA)")).toBe("유이카YUIKA");
      expect(removeBrackets("【test】<test2>")).toBe("testtest2");
    });

    it("괄호 안의 내용도 유지해야 함", () => {
      expect(removeBrackets("『유이카』")).toBe("유이카");
      expect(removeBrackets("(유이카)")).toBe("유이카");
    });
  });

 
});
