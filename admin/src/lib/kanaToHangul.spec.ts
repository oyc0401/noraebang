// test/kanaToHangul.test.ts
import { kanaToHangul } from "./kanaToHangul";

describe("kanaToHangul", () => {
  it("basic hiragana", () => {
    expect(kanaToHangul("さようなら")).toBe("사요나라"); // おう/よう 장음은 제거
    expect(kanaToHangul("ありがとう")).toBe("아리가토"); // とう -> と
    expect(kanaToHangul("おはよう")).toBe("오하요"); // よう -> よ
  });

  it("youon (きゃ/しゅ/ちょ)", () => {
    expect(kanaToHangul("きゃく")).toBe("캬쿠");
    expect(kanaToHangul("しゅくだい")).toBe("슈쿠다이");
    expect(kanaToHangul("ちょっと")).toBe("춋토");
    expect(kanaToHangul("きゅう")).toBe("큐"); // きゅ + う drop
    expect(kanaToHangul("きょう")).toBe("쿄"); // きょ + う drop
    expect(kanaToHangul("しょくどう")).toBe("쇼쿠도"); // どう -> ど
    expect(kanaToHangul("にゃん")).toBe("냥");
    expect(kanaToHangul("にゅうがく")).toBe("뉴가쿠"); // う drop
    expect(kanaToHangul("みゅーじっく")).toBe("뮤지쿠"); // ー drop
    expect(kanaToHangul("びょういん")).toBe("뵤인"); // びょ + う drop
    expect(kanaToHangul("ぴょん")).toBe("푱"); // ん 규칙 결합
    expect(kanaToHangul("りょこう")).toBe("료코"); // こう -> こ
  });

  it("sokuon (small っ)", () => {
    expect(kanaToHangul("かった")).toBe("캇타");
    expect(kanaToHangul("きって")).toBe("킷테");
    expect(kanaToHangul("いって")).toBe("잇테");
    expect(kanaToHangul("がっこう")).toBe("각코"); // こう -> こ
    expect(kanaToHangul("ろっく")).toBe("록쿠");
    expect(kanaToHangul("けっこん")).toBe("켓콘");
    expect(kanaToHangul("ざっし")).toBe("잣시");
    expect(kanaToHangul("きっぷ")).toBe("킵푸");
    expect(kanaToHangul("まっすぐ")).toBe("맛스구");
  });

  it("drop long-vowel-like markers (おう/よう/えい)", () => {
    expect(kanaToHangul("さようなら")).toBe("사요나라"); // よ + [う drop]
    expect(kanaToHangul("せんせい")).toBe("센세"); // せ + [い drop]
    expect(kanaToHangul("おおきい")).toBe("오키"); // おお -> お, きい -> き
    expect(kanaToHangul("おねえさん")).toBe("오네상"); // ねえ -> ね
    expect(kanaToHangul("えいご")).toBe("에고"); // えい -> え
    expect(kanaToHangul("けいさつ")).toBe("케사츠"); // けい -> け
  });

  it("katakana normalization + ー", () => {
    expect(kanaToHangul("カタカナ")).toBe("카타카나");
    expect(kanaToHangul("コーヒー")).toBe("코히");
  });

  it("katakana loanword combos (ティ/ファ/フォ etc.)", () => {
    expect(kanaToHangul("パーティー")).toBe("파티");
    expect(kanaToHangul("ティッシュ")).toBe("팃슈");
    expect(kanaToHangul("フォーク")).toBe("포쿠");
  });

  it("dakuten/handakuten basics", () => {
    expect(kanaToHangul("がくせい")).toBe("가쿠세"); // せい -> せ
    expect(kanaToHangul("ぐんたい")).toBe("군타이");
    expect(kanaToHangul("げんき")).toBe("겐키");
    expect(kanaToHangul("ごはん")).toBe("고한");
  });

  it("unknown chars pass-through", () => {
    expect(kanaToHangul("誕生日(たんじょうび)")).toBe("誕生日(탄죠비)");
    expect(kanaToHangul("第3回(だいさんかい)")).toBe("第3回(다이산카이)");
    expect(kanaToHangul("!?(びっくり)")).toBe("!?(빗쿠리)");
  });

  it("특별 사전 매핑 (따로 처리)", () => {
    expect(kanaToHangul("とうきょう")).toBe("도쿄");
  });

  it("ん 변형", () => {
    expect(kanaToHangul("あいみょん")).toBe("아이묭");
    expect(kanaToHangul("いんまん")).toBe("인만");
    expect(kanaToHangul("あれくん")).toBe("아레쿤");
    expect(kanaToHangul("りろん")).toBe("리론");
    expect(kanaToHangul("りんね")).toBe("린네");
    expect(kanaToHangul("りんご")).toBe("링고");
    expect(kanaToHangul("さんぽ")).toBe("삼포"); // ん->ㅁ
    expect(kanaToHangul("しんぶん")).toBe("심분"); // ん->ㅁ
    expect(kanaToHangul("てんぷら")).toBe("템푸라"); // ん->ㅁ
    expect(kanaToHangul("かんぱい")).toBe("캄파이"); // ん->ㅁ
    expect(kanaToHangul("しんまい")).toBe("심마이"); // ん->ㅁ
    expect(kanaToHangul("まんいち")).toBe("만이치"); // 모음 앞이면 ㄴ 유지
    expect(kanaToHangul("てんいん")).toBe("텐인");
    expect(kanaToHangul("かんおん")).toBe("칸온");
    expect(kanaToHangul("げんき")).toBe("겐키");
    expect(kanaToHangul("あんがい")).toBe("앙가이"); // ん + が(velar) -> ㅇ 느낌
    expect(kanaToHangul("りんかい")).toBe("링카이");
    expect(kanaToHangul("ほんと")).toBe("혼토");
  });

  it("ちゃん", () => {
    expect(kanaToHangul("めいちゃん")).toBe("메이쨩");
    expect(kanaToHangul("あかちゃん")).toBe("아카쨩");
    expect(kanaToHangul("おじいちゃん")).toBe("오지쨩"); // じい drop
    expect(kanaToHangul("ねえちゃん")).toBe("네쨩"); // ねえ drop
    expect(kanaToHangul("みっちゃん")).toBe("밋쨩");
    expect(kanaToHangul("まーちゃん")).toBe("마쨩");
  });

  it("つ", () => {
    expect(kanaToHangul("つき")).toBe("츠키");
  });

  it("장음 아닌것", () => {
    expect(kanaToHangul("せいな")).toBe("세이나");
    expect(kanaToHangul("せいか")).toBe("세이카");
    expect(kanaToHangul("けいと")).toBe("케이토");
    expect(kanaToHangul("れいな")).toBe("레이나");
    expect(kanaToHangul("めいこ")).toBe("메이코");
    expect(kanaToHangul("えいこ")).toBe("에이코");
    expect(kanaToHangul("こい")).toBe("코이"); // 단순 こ + い
    expect(kanaToHangul("あい")).toBe("아이");
    expect(kanaToHangul("うい")).toBe("우이");
    expect(kanaToHangul("おいしい")).toBe("오이시이"); // しい는 요음 아님
    expect(kanaToHangul("おいで")).toBe("오이데");
  });

  it("edge: mixed scripts + spacing/punctuation", () => {
    expect(kanaToHangul("コーヒー, ください。")).toBe("코히, 쿠다사이。");
    expect(kanaToHangul("「きょう」")).toBe("「쿄」");
    expect(kanaToHangul("（がっこう）")).toBe("（각코）");
    expect(kanaToHangul("  すし  ")).toBe("  스시  ");
  });

  // ====================
  // Grammar/pronunciation edge cases
  // ====================

  describe("grammar pronunciation edge cases (enable when rules are implemented)", () => {
    it("particle: は as 'wa' when used as topic marker", () => {
      expect(kanaToHangul("わたしはがくせいです")).toBe("와타시와가쿠세데스"); // せい drop
      expect(kanaToHangul("これはペンです")).toBe("코레와펜데스");
      expect(kanaToHangul("きょうはあつい")).toBe("쿄와아츠이"); // きょう -> きょ
      expect(kanaToHangul("こんにちは")).toBe("콘니치와"); // 実発音
    });

    it("particle: へ as 'e' when used as direction marker", () => {
      expect(kanaToHangul("がっこうへいく")).toBe("각코에이쿠"); // こう drop
      expect(kanaToHangul("うちへかえる")).toBe("우치에카에루");
    });

    it("particle: を as 'o' when used as object marker", () => {
      expect(kanaToHangul("すしをたべる")).toBe("스시오타베루");
      expect(kanaToHangul("みずをのむ")).toBe("미즈오노무");
    });
  });

  it("grammar: quotation particle って / った / ってば (sokuon across morpheme boundary)", () => {
    expect(kanaToHangul("だって")).toBe("닷테");
    expect(kanaToHangul("って")).toBe("ッテ" as any); // 구현이 단독 っ 처리 못 하면 pass-through 가능: 정책 정해서 고치세요
    expect(kanaToHangul("ってば")).toBe("ッテ바" as any);
    expect(kanaToHangul("いった")).toBe("잇타");
    expect(kanaToHangul("おもった")).toBe("오못타");
  });

  it("grammar: contractions じゃ / ちゃ / じゃない / ちゃう / ちゃった", () => {
    // では → じゃ (dewa → ja)
    expect(kanaToHangul("それじゃ")).toBe("소레쟈");
    expect(kanaToHangul("じゃない")).toBe("쟈나이");
    expect(kanaToHangul("じゃなかった")).toBe("쟈나캇타");

    // ては → ちゃ (tewa → cha)
    expect(kanaToHangul("たべちゃう")).toBe("타베챠우"); // う drop 정책이면 타베챠
    expect(kanaToHangul("みちゃった")).toBe("미챳타");
    expect(kanaToHangul("しちゃう")).toBe("시챠우"); // う drop 정책이면 시챠
    expect(kanaToHangul("やっちゃった")).toBe("얏챳타");
  });

  it("grammar: polite/auxiliary long-vowel-like endings (でしょう / ましょう / ましょうか)", () => {
    // でしょう: でしょ + う(drop) = でしょ
    expect(kanaToHangul("そうでしょう")).toBe("소데쇼");
    expect(kanaToHangul("いいでしょうか")).toBe("이데쇼카");
    // ましょう: ましょ + う(drop) = ましょ
    expect(kanaToHangul("いきましょう")).toBe("이키마쇼");
    expect(kanaToHangul("やりましょうか")).toBe("야리마쇼카");
  });

  it("grammar: ている / ておく / てしまう (don't accidentally treat てい as long-vowel drop)", () => {
    // ている는 '테이루'가 자연스럽고, てい를 장음처럼 날려버리면 체감 품질 급락
    expect(kanaToHangul("たべている")).toBe("타베테이루");
    expect(kanaToHangul("みている")).toBe("미테이루");
    expect(kanaToHangul("している")).toBe("시테이루");

    // ておく(=해 두다): おう/えい 룰과 혼동 없는지
    expect(kanaToHangul("かっておく")).toBe("캇테오쿠");
    expect(kanaToHangul("やっておく")).toBe("얏테오쿠");

    // てしまう: 축약(ちゃう)랑 같이 있을 때도 안정적으로
    expect(kanaToHangul("たべてしまう")).toBe("타베테시마우"); // う drop 정책이면 타베테시마
    expect(kanaToHangul("やってしまった")).toBe("얏테시맛타");
  });

  it("grammar: んです / なんです / なんですか (moraic nasal + です)", () => {
    expect(kanaToHangul("そうなんです")).toBe("소난데스");
    expect(kanaToHangul("なんですか")).toBe("난데스카");
    expect(kanaToHangul("だめなんです")).toBe("다메난데스");
    expect(kanaToHangul("しんぱいなんです")).toBe("심파이난데스"); // ん->ㅁ before ぱ
  });

  it("grammar: negative forms with ない / なかった (sokuon + negative)", () => {
    expect(kanaToHangul("いかない")).toBe("이카나이");
    expect(kanaToHangul("たべない")).toBe("타베나이");
    expect(kanaToHangul("しない")).toBe("시나이");
    expect(kanaToHangul("いかなかった")).toBe("이카나캇타");
    expect(kanaToHangul("たべなかった")).toBe("타베나캇타");
    expect(kanaToHangul("しなかった")).toBe("시나캇타");
  });

  it("grammar: conditionals たら / なら / ても (sokuon boundary stability)", () => {
    expect(kanaToHangul("いったら")).toBe("잇타라");
    expect(kanaToHangul("やったら")).toBe("얏타라");
    expect(kanaToHangul("かったら")).toBe("캇타라");

    expect(kanaToHangul("いくなら")).toBe("이쿠나라");
    expect(kanaToHangul("するなら")).toBe("스루나라");

    expect(kanaToHangul("いっても")).toBe("잇테모");
    expect(kanaToHangul("やっても")).toBe("얏테모");
  });

  it("grammar: question/ending particles (ね/よ/かな/かい) keep them intact", () => {
    expect(kanaToHangul("いいね")).toBe("이이네");
    expect(kanaToHangul("いいよ")).toBe("이이요");
    expect(kanaToHangul("いいかな")).toBe("이이카나");
    expect(kanaToHangul("いいかい")).toBe("이이카이");
    expect(kanaToHangul("いく？")).toBe("이쿠？");
  });

  it("grammar: small っ at start or isolated should not crash (policy check)", () => {
    // 이런 입력은 보통 비정상이지만, 라이브러리는 크래시 없이 정책대로 처리해야 함
    expect(() => kanaToHangul("っ")).not.toThrow();
    expect(() => kanaToHangul("っあ")).not.toThrow();
    expect(() => kanaToHangul("っか")).not.toThrow();
  });

  it("grammar: consecutive long-vowel-like patterns should be stable", () => {
    expect(kanaToHangul("おおおお")).toBe("오");
    expect(kanaToHangul("えいえい")).toBe("에에"); // 각 えい -> え
    expect(kanaToHangul("ようよう")).toBe("요요"); // 각 よう -> よ
    expect(kanaToHangul("こうこう")).toBe("코코"); // 각 こう -> こ
  });

  it("grammar: tricky boundaries with ん + youon/sokuon", () => {
    expect(kanaToHangul("しんゆう")).toBe("신유"); // ゆう drop
    expect(kanaToHangul("てんきゃく")).toBe("텐캬쿠"); // ん + きゃ
    expect(kanaToHangul("さんちょく")).toBe("산쵸쿠"); // ん + ちょ
    expect(kanaToHangul("まんちょっと")).toBe("만춋토"); // ん + ちょっ
  });
});
