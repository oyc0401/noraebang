import {
  detectJapaneseType,
  hasMixedKana,
  hiraganaToKatakana,
  katakanaToHiragana,
  removeBrackets,
  toAllHiragana,
  toAllKatakana,
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

  describe("katakanaToHiragana", () => {
    it("카타카나를 히라가나로 변환해야 함", () => {
      expect(katakanaToHiragana("ガラクタ")).toBe("がらくた");
      expect(katakanaToHiragana("ユイカ")).toBe("ゆいか");
      expect(katakanaToHiragana("ヨアソビ")).toBe("よあそび");
    });

    it("히라가나는 그대로 유지해야 함", () => {
      expect(katakanaToHiragana("がらくた")).toBe("がらくた");
      expect(katakanaToHiragana("ゆいか")).toBe("ゆいか");
    });

    it("카타카나와 히라가나가 섞여있으면 카타카나만 변환해야 함", () => {
      expect(katakanaToHiragana("ガラクタがらくた")).toBe("がらくたがらくた");
    });

    it("일본어가 아닌 문자는 그대로 유지해야 함", () => {
      expect(katakanaToHiragana("test")).toBe("test");
      expect(katakanaToHiragana("테스트")).toBe("테스트");
      expect(katakanaToHiragana("123")).toBe("123");
    });

    it("빈 문자열을 처리해야 함", () => {
      expect(katakanaToHiragana("")).toBe("");
    });
  });

  describe("detectJapaneseType", () => {
    it("한자를 감지해야 함", () => {
      expect(detectJapaneseType("漢字")).toBe("kanji");
      expect(detectJapaneseType("日本語")).toBe("kanji");
    });

    it("가나를 감지해야 함 (히라가나)", () => {
      expect(detectJapaneseType("ひらがな")).toBe("kana");
      expect(detectJapaneseType("がらくた")).toBe("kana");
    });

    it("가나를 감지해야 함 (카타카나)", () => {
      expect(detectJapaneseType("カタカナ")).toBe("kana");
      expect(detectJapaneseType("ガラクタ")).toBe("kana");
      expect(detectJapaneseType("ユイカ")).toBe("kana");
    });

    it("한자와 가나가 섞여있으면 kanji를 반환해야 함", () => {
      expect(detectJapaneseType("漢字ひらがな")).toBe("kanji");
      expect(detectJapaneseType("日本語カタカナ")).toBe("kanji");
    });

    it("일본어가 아닌 문자는 mixed를 반환해야 함", () => {
      expect(detectJapaneseType("test")).toBe("mixed");
      expect(detectJapaneseType("테스트")).toBe("mixed");
      expect(detectJapaneseType("123")).toBe("mixed");
      expect(detectJapaneseType("YOASOBI")).toBe("mixed");
    });

    it("빈 문자열은 mixed를 반환해야 함", () => {
      expect(detectJapaneseType("")).toBe("mixed");
    });
  });

  describe("hiraganaToKatakana", () => {
    it("히라가나를 카타카나로 변환해야 함", () => {
      expect(hiraganaToKatakana("がらくた")).toBe("ガラクタ");
      expect(hiraganaToKatakana("ゆいか")).toBe("ユイカ");
      expect(hiraganaToKatakana("よあそび")).toBe("ヨアソビ");
    });

    it("카타카나는 그대로 유지해야 함", () => {
      expect(hiraganaToKatakana("ガラクタ")).toBe("ガラクタ");
      expect(hiraganaToKatakana("ユイカ")).toBe("ユイカ");
    });

    it("히라가나와 카타카나가 섞여있으면 히라가나만 변환해야 함", () => {
      expect(hiraganaToKatakana("がらくたガラクタ")).toBe("ガラクタガラクタ");
    });

    it("일본어가 아닌 문자는 그대로 유지해야 함", () => {
      expect(hiraganaToKatakana("test")).toBe("test");
      expect(hiraganaToKatakana("테스트")).toBe("테스트");
    });
  });

  describe("hasMixedKana", () => {
    it("히라가나와 카타카나가 섞여있으면 true", () => {
      expect(hasMixedKana("ひらガナ")).toBe(true);
      expect(hasMixedKana("がらくたガラクタ")).toBe(true);
      expect(hasMixedKana("カタカナひらがな")).toBe(true);
    });

    it("히라가나만 있으면 false", () => {
      expect(hasMixedKana("ひらがな")).toBe(false);
      expect(hasMixedKana("がらくた")).toBe(false);
    });

    it("카타카나만 있으면 false", () => {
      expect(hasMixedKana("カタカナ")).toBe(false);
      expect(hasMixedKana("ガラクタ")).toBe(false);
    });

    it("일본어가 아닌 문자만 있으면 false", () => {
      expect(hasMixedKana("test")).toBe(false);
      expect(hasMixedKana("테스트")).toBe(false);
    });
  });

  describe("toAllHiragana", () => {
    it("혼합된 가나를 전부 히라가나로 변환", () => {
      expect(toAllHiragana("ひらガナ")).toBe("ひらがな");
      expect(toAllHiragana("がらくたガラクタ")).toBe("がらくたがらくた");
    });

    it("이미 전부 히라가나면 그대로", () => {
      expect(toAllHiragana("ひらがな")).toBe("ひらがな");
    });

    it("전부 카타카나면 전부 히라가나로", () => {
      expect(toAllHiragana("カタカナ")).toBe("かたかな");
    });
  });

  describe("toAllKatakana", () => {
    it("혼합된 가나를 전부 카타카나로 변환", () => {
      expect(toAllKatakana("ひらガナ")).toBe("ヒラガナ");
      expect(toAllKatakana("がらくたガラクタ")).toBe("ガラクタガラクタ");
    });

    it("이미 전부 카타카나면 그대로", () => {
      expect(toAllKatakana("カタカナ")).toBe("カタカナ");
    });

    it("전부 히라가나면 전부 카타카나로", () => {
      expect(toAllKatakana("ひらがな")).toBe("ヒラガナ");
    });
  });
});
