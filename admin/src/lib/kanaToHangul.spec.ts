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
    expect(kanaToHangul("げんき")).toBe("겡키");
    expect(kanaToHangul("ごはん")).toBe("고한");
  });

  it("unknown chars pass-through", () => {
    expect(kanaToHangul("誕生日(たんじょうび)")).toBe("誕生日(탄죠비)");
    expect(kanaToHangul("第3回(だいさんかい)")).toBe("第3回(다이상카이)");
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
    expect(kanaToHangul("げんき")).toBe("겡키");
    expect(kanaToHangul("あんがい")).toBe("앙가이"); // ん + が(velar) -> ㅇ 느낌
    expect(kanaToHangul("りんかい")).toBe("링카이");
    expect(kanaToHangul("ほんと")).toBe("혼토");
    expect(kanaToHangul("にゃんこ")).toBe("냥코"); // にゃ + ん + こ
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
    expect(kanaToHangul("てんきゃく")).toBe("텡캬쿠"); // ん + きゃ
    expect(kanaToHangul("さんちょく")).toBe("산쵸쿠"); // ん + ちょ
    expect(kanaToHangul("まんちょっと")).toBe("만춋토"); // ん + ちょっ
  });
});

describe("kanaToHangul2", () => {
  it("basic hiragana", () => {
    expect(kanaToHangul("ようこそ")).toBe("요코소"); // よう -> よ
    expect(kanaToHangul("おめでとう")).toBe("오메데토"); // とう -> と
    expect(kanaToHangul("おはようさん")).toBe("오하요상"); // よう -> よ, さん -> 상(관용)
  });

  it("youon (きゃ/しゅ/ちょ)", () => {
    expect(kanaToHangul("きゃんぷ")).toBe("캼푸"); // きゃ + ん(ㅁ before ぷ) + ぷ
    expect(kanaToHangul("しゅっぱつ")).toBe("슙파츠"); // しゅ + っ(ㅂ before ぱ) + ぱつ
    expect(kanaToHangul("ちょっぴり")).toBe("춉피리"); // ちょ + っ(ㅂ before ぴ) + ぴり
    expect(kanaToHangul("ぎゅう")).toBe("규"); // ぎゅ + う drop
    expect(kanaToHangul("りょう")).toBe("료"); // りょ + う drop
    expect(kanaToHangul("ちょうど")).toBe("쵸도"); // ちょ + う drop
    expect(kanaToHangul("にゃんこ")).toBe("냥코"); // にゃ + ん + こ
    expect(kanaToHangul("りゅうがく")).toBe("류가쿠"); // りゅ + う drop
    expect(kanaToHangul("にゅーす")).toBe("뉴스"); // ー drop
    expect(kanaToHangul("びょうき")).toBe("뵤키"); // びょ + う drop
    expect(kanaToHangul("にょん")).toBe("뇽"); // 요음 + ん(어말) => ㅇ
    expect(kanaToHangul("ぎょこう")).toBe("교코"); // こう -> こ
  });

  it("sokuon (small っ)", () => {
    expect(kanaToHangul("さっき")).toBe("삭키");
    expect(kanaToHangul("まって")).toBe("맛테");
    expect(kanaToHangul("のって")).toBe("놋테");
    expect(kanaToHangul("けっこう")).toBe("켓코"); // こう -> こ
    expect(kanaToHangul("まっく")).toBe("막쿠");
    expect(kanaToHangul("ざっか")).toBe("작카");
    expect(kanaToHangul("さっし")).toBe("삿시");
    expect(kanaToHangul("しっぽ")).toBe("십포");
    expect(kanaToHangul("まっさか")).toBe("맛사카");
  });

  it("drop long-vowel-like markers (おう/よう/えい)", () => {
    expect(kanaToHangul("ようふく")).toBe("요후쿠"); // よう -> よ
    expect(kanaToHangul("せいふく")).toBe("세후쿠"); // せい -> せ
    expect(kanaToHangul("おおきいな")).toBe("오키나"); // おお -> お, きい -> き
    expect(kanaToHangul("ねえさん")).toBe("네상"); // ねえ -> ね, さん -> 상
    expect(kanaToHangul("えいが")).toBe("에가"); // えい -> え
    expect(kanaToHangul("けいかく")).toBe("케카쿠"); // けい -> け
  });

  it("katakana normalization + ー", () => {
    expect(kanaToHangul("テレビ")).toBe("테레비");
    expect(kanaToHangul("ジュース")).toBe("쥬스"); // ー 없음, normalize + 요음 그대로
  });

  it("katakana loanword combos (ティ/ファ/フォ etc.)", () => {
    expect(kanaToHangul("ティー")).toBe("티"); // ー drop
    expect(kanaToHangul("ファイル")).toBe("파이루"); // ふぁ + い + る
    expect(kanaToHangul("フォト")).toBe("포토"); // ふぉ + と
  });

  it("dakuten/handakuten basics", () => {
    expect(kanaToHangul("ぎんこう")).toBe("깅코"); // こう -> こ
    expect(kanaToHangul("げんだい")).toBe("겐다이");
    expect(kanaToHangul("ごぜん")).toBe("고젠");
    expect(kanaToHangul("ばくはつ")).toBe("바쿠하츠");
  });

  it("unknown chars pass-through", () => {
    expect(kanaToHangul("記録(きろく)")).toBe("記録(키로쿠)");
    expect(kanaToHangul("第2章(だいにしょう)")).toBe("第2章(다이니쇼)");
    expect(kanaToHangul("!?(まっか)")).toBe("!?(막카)");
  });

  it("특별 사전 매핑 (따로 처리)", () => {
    expect(kanaToHangul("とうきょう")).toBe("도쿄");
  });

  it("ん 변형", () => {
    expect(kanaToHangul("しょん")).toBe("숑"); // 요음 + ん(어말) => ㅇ
    expect(kanaToHangul("うんまん")).toBe("운만"); // 모음 단독(う) 뒤 ん + ま => ㄴ 유지
    expect(kanaToHangul("たろうくん")).toBe("타로쿤"); // ろう -> ろ, くん
    expect(kanaToHangul("かろん")).toBe("카론"); // …ろん
    expect(kanaToHangul("ほんね")).toBe("혼네"); // ん + ね
    expect(kanaToHangul("まんが")).toBe("망가"); // ん + が => ㅇ
    expect(kanaToHangul("さんぷる")).toBe("삼푸루"); // ん->ㅁ before ぷ
    expect(kanaToHangul("しんぱん")).toBe("심판"); // ん->ㅁ before ぱ, 그리고 ぱん(어말 ん) => 판
    expect(kanaToHangul("てんぷき")).toBe("템푸키"); // ん->ㅁ before ぷ
    expect(kanaToHangul("かんぱく")).toBe("캄파쿠"); // ん->ㅁ before ぱ
    expect(kanaToHangul("まんい")).toBe("만이"); // 모음 앞이면 ㄴ 유지
    expect(kanaToHangul("てんいき")).toBe("텐이키"); // 모음 앞 ㄴ 유지
    expect(kanaToHangul("かんおと")).toBe("칸오토"); // 모음 앞 ㄴ 유지
    expect(kanaToHangul("あんがく")).toBe("앙가쿠"); // ん + が => ㅇ
    expect(kanaToHangul("りんこう")).toBe("링코"); // r + (k/g) => ㅇ + こう drop
    expect(kanaToHangul("ほんとに")).toBe("혼토니");
  });

  it("ちゃん", () => {
    expect(kanaToHangul("れいちゃん")).toBe("레이쨩");
    expect(kanaToHangul("みかちゃん")).toBe("미카쨩");
    expect(kanaToHangul("じいちゃん")).toBe("지쨩"); // じい drop
    expect(kanaToHangul("おねえちゃん")).toBe("오네쨩"); // ねえ drop
    expect(kanaToHangul("りっちゃん")).toBe("릿쨩");
    expect(kanaToHangul("さーちゃん")).toBe("사쨩"); // ー drop
  });

  it("つ", () => {
    expect(kanaToHangul("つめ")).toBe("츠메");
  });

  it("장음 아닌것", () => {
    expect(kanaToHangul("せいな")).toBe("세이나");
    expect(kanaToHangul("せいか")).toBe("세이카");
    expect(kanaToHangul("けいと")).toBe("케이토");
    expect(kanaToHangul("れいな")).toBe("레이나");
    expect(kanaToHangul("めいこ")).toBe("메이코");
    expect(kanaToHangul("えいこ")).toBe("에이코");
    expect(kanaToHangul("こい")).toBe("코이");
    expect(kanaToHangul("あい")).toBe("아이");
    expect(kanaToHangul("うい")).toBe("우이");
    expect(kanaToHangul("おいしい")).toBe("오이시이");
    expect(kanaToHangul("おいで")).toBe("오이데");
  });

  it("edge: mixed scripts + spacing/punctuation", () => {
    expect(kanaToHangul("ジュース, おねがい。")).toBe("쥬스, 오네가이。");
    expect(kanaToHangul("「りょう」")).toBe("「료」");
    expect(kanaToHangul("（けっこう）")).toBe("（켓코）");
    expect(kanaToHangul("  たこ  ")).toBe("  타코  ");
  });

  // ====================
  // Grammar/pronunciation edge cases
  // ====================

  describe("grammar pronunciation edge cases (enable when rules are implemented)", () => {
    it("particle: は as 'wa' when used as topic marker", () => {
      expect(kanaToHangul("あなたはせいふくです")).toBe("아나타와세후쿠데스"); // せい drop
      expect(kanaToHangul("それはノートです")).toBe("소레와노토데스"); // ー drop
      expect(kanaToHangul("あしたはさむい")).toBe("아시타와사무이");
      expect(kanaToHangul("こんにちは")).toBe("콘니치와"); // 実発音
    });

    it("particle: へ as 'e' when used as direction marker", () => {
      expect(kanaToHangul("としょかんへいく")).toBe("토쇼칸에이쿠"); // へ->え, えいく drop 금지
      expect(kanaToHangul("いえへかえる")).toBe("이에에카에루");
    });

    it("particle: を as 'o' when used as object marker", () => {
      expect(kanaToHangul("パンをたべる")).toBe("판오타베루");
      expect(kanaToHangul("みずをのむ")).toBe("미즈오노무");
    });
  });

  it("grammar: quotation particle って / った / ってば (sokuon across morpheme boundary)", () => {
    expect(kanaToHangul("だってさ")).toBe("닷테사");
    expect(kanaToHangul("って")).toBe("ッテ" as any);
    expect(kanaToHangul("ってば")).toBe("ッテ바" as any);
    expect(kanaToHangul("やった")).toBe("얏타");
    expect(kanaToHangul("しった")).toBe("싯타");
  });

  it("grammar: contractions じゃ / ちゃ / じゃない / ちゃう / ちゃった", () => {
    // では → じゃ (dewa → ja)
    expect(kanaToHangul("ここじゃ")).toBe("코코쟈");
    expect(kanaToHangul("ここじゃない")).toBe("코코쟈나이");
    expect(kanaToHangul("ほんとじゃなかった")).toBe("혼토쟈나캇타");

    // ては → ちゃ (tewa → cha)
    expect(kanaToHangul("いっちゃう")).toBe("잇챠우");
    expect(kanaToHangul("かっちゃった")).toBe("캇챳타");
    expect(kanaToHangul("やっちゃう")).toBe("얏챠우");
    expect(kanaToHangul("いっちゃった")).toBe("잇챳타");
  });

  it("grammar: polite/auxiliary long-vowel-like endings (でしょう / ましょう / ましょうか)", () => {
    expect(kanaToHangul("いやでしょう")).toBe("이야데쇼");
    expect(kanaToHangul("だめでしょうか")).toBe("다메데쇼카");
    expect(kanaToHangul("のみましょう")).toBe("노미마쇼");
    expect(kanaToHangul("かえりましょうか")).toBe("카에리마쇼카");
  });

  it("grammar: ている / ておく / てしまう (don't accidentally treat てい as long-vowel drop)", () => {
    expect(kanaToHangul("よんでいる")).toBe("욘데이루");
    expect(kanaToHangul("はなしている")).toBe("하나시테이루");
    expect(kanaToHangul("まっている")).toBe("맛테이루");

    expect(kanaToHangul("とっておく")).toBe("톳테오쿠");
    expect(kanaToHangul("うっておく")).toBe("웃테오쿠");

    expect(kanaToHangul("のんでしまう")).toBe("논데시마우");
    expect(kanaToHangul("いってしまった")).toBe("잇테시맛타");
  });

  it("grammar: んです / なんです / なんですか (moraic nasal + です)", () => {
    expect(kanaToHangul("そうなんです")).toBe("소난데스");
    expect(kanaToHangul("なんですか")).toBe("난데스카");
    expect(kanaToHangul("むりなんです")).toBe("무리난데스");
    expect(kanaToHangul("しんぱいなんです")).toBe("심파이난데스");
  });

  it("grammar: negative forms with ない / なかった (sokuon + negative)", () => {
    expect(kanaToHangul("いかない")).toBe("이카나이");
    expect(kanaToHangul("のまない")).toBe("노마나이");
    expect(kanaToHangul("いわない")).toBe("이와나이");
    expect(kanaToHangul("いかなかった")).toBe("이카나캇타");
    expect(kanaToHangul("のまなかった")).toBe("노마나캇타");
    expect(kanaToHangul("いわなかった")).toBe("이와나캇타");
  });

  it("grammar: conditionals たら / なら / ても (sokuon boundary stability)", () => {
    expect(kanaToHangul("やったら")).toBe("얏타라");
    expect(kanaToHangul("いったら")).toBe("잇타라");
    expect(kanaToHangul("まったら")).toBe("맛타라");

    expect(kanaToHangul("いくなら")).toBe("이쿠나라");
    expect(kanaToHangul("のむなら")).toBe("노무나라");

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
    expect(() => kanaToHangul("っ")).not.toThrow();
    expect(() => kanaToHangul("っあ")).not.toThrow();
    expect(() => kanaToHangul("っか")).not.toThrow();
  });

  it("grammar: consecutive long-vowel-like patterns should be stable", () => {
    expect(kanaToHangul("おおおお")).toBe("오");
    expect(kanaToHangul("えいえい")).toBe("에에");
    expect(kanaToHangul("ようよう")).toBe("요요");
    expect(kanaToHangul("こうこう")).toBe("코코");
  });

  it("grammar: tricky boundaries with ん + youon/sokuon", () => {
    expect(kanaToHangul("しんゆう")).toBe("신유"); // ゆう drop
    expect(kanaToHangul("てんきゃく")).toBe("텡캬쿠");
    expect(kanaToHangul("まんちょく")).toBe("만쵸쿠");
    expect(kanaToHangul("さんちょっと")).toBe("산춋토");
  });
});

describe("kanaToHangul (extra)", () => {
  // --------------------
  // youon coverage 확대
  // --------------------
  it("youon variety (りゃ/ぎょ/ぴゅ etc.)", () => {
    expect(kanaToHangul("りゃく")).toBe("랴쿠");
    expect(kanaToHangul("ぎょざ")).toBe("교자");
    expect(kanaToHangul("ぴゅあ")).toBe("퓨아");
    expect(kanaToHangul("びゃく")).toBe("뱌쿠");
    expect(kanaToHangul("みょん")).toBe("묭"); // 요음 + ん(어말) => ㅇ
    expect(kanaToHangul("にゃんか")).toBe("냥카"); // 요음 + ん + k => ㅇ (규칙)
  });

  // --------------------
  // sokuon edge 확대
  // --------------------
  it("sokuon with different following consonant classes", () => {
    expect(kanaToHangul("はっぴょう")).toBe("합표"); // っ + ぴ => ㅂ 종성
    expect(kanaToHangul("がっき")).toBe("각키"); // っ + k
    expect(kanaToHangul("けっきょく")).toBe("켓쿄쿠"); // けっ(=ㅅ) + きょ
    expect(kanaToHangul("きゃっきゃ")).toBe("캭캬"); // っ 처리 + 요음
  });

  // --------------------
  // 장음 드롭 패턴 확대
  // --------------------
  it("long-vowel-like drops (more patterns)", () => {
    expect(kanaToHangul("どうぞ")).toBe("도조"); // どう -> ど
    expect(kanaToHangul("こうこう")).toBe("코코"); // 각 こう -> こ
    expect(kanaToHangul("せいせい")).toBe("세세"); // 각 せい -> せ (예외 아닌 경우)
    expect(kanaToHangul("えいえん")).toBe("에엔"); // えい -> え, えん -> 엔(기본 ㄴ)
  });

  // --------------------
  // 장음 아닌 것(예외) 확대
  // --------------------
  it("non-long-vowel exceptions should remain (えいこ/けいと/せいな/せいか)", () => {
    expect(kanaToHangul("えいこ")).toBe("에이코");
    expect(kanaToHangul("けいと")).toBe("케이토");
    expect(kanaToHangul("せいな")).toBe("세이나");
    expect(kanaToHangul("せいか")).toBe("세이카");
    expect(kanaToHangul("えいく")).toBe("에이쿠"); // particle へ→え + いく 대응 (드롭 금지)
  });

  // --------------------
  // ん 동화 더 때리기
  // --------------------
  it("moraic nasal ん assimilation more cases", () => {
    expect(kanaToHangul("さんび")).toBe("삼비"); // ん + び => ㅁ
    expect(kanaToHangul("しんぽ")).toBe("심포"); // ん + ぽ => ㅁ
    expect(kanaToHangul("てんぷ")).toBe("템푸"); // ん + ぷ => ㅁ
    expect(kanaToHangul("あんこ")).toBe("앙코"); // ん + こ(k) => (규칙에 따라 ㅇ)
    expect(kanaToHangul("にゃんこ")).toBe("냥코"); // 요음 + ん + k => ㅇ
    expect(kanaToHangul("りんぐ")).toBe("링구"); // r + g => ㅇ (규칙)
    expect(kanaToHangul("しんゆう")).toBe("신유"); // ゆう drop
  });

  // --------------------
  // honorific さん
  // --------------------
  it("honorific さん should become 상 at end", () => {
    expect(kanaToHangul("たなかさん")).toBe("타나카상");
    expect(kanaToHangul("すずきさん")).toBe("스즈키상");
  });

  // --------------------
  // particles は / へ / を (heuristic)
  // --------------------
  it("particles heuristics (は/へ/を)", () => {
    expect(kanaToHangul("ぼくはがくせいです")).toBe("보쿠와가쿠세데스"); // せい drop + は->わ
    expect(kanaToHangul("ここはさむい")).toBe("코코와사무이"); // は->わ
    expect(kanaToHangul("うみへいく")).toBe("우미에이쿠"); // へ->え + えいく 유지
    expect(kanaToHangul("みずをのむ")).toBe("미즈오노무"); // を->오
  });

  // --------------------
  // contractions じゃ / ちゃ + sokuon 안정성
  // --------------------
  it("contractions stability (じゃ/ちゃ) with boundaries", () => {
    expect(kanaToHangul("それじゃだめ")).toBe("소레쟈다메");
    expect(kanaToHangul("いっちゃだめ")).toBe("잇챠다메");
    expect(kanaToHangul("やっちゃった")).toBe("얏챳타");
    expect(kanaToHangul("じゃなかった")).toBe("쟈나캇타");
  });

  // --------------------
  // mixed scripts, punctuation robustness
  // --------------------
  it("mixed scripts + punctuation robustness", () => {
    expect(kanaToHangul("「コーヒーをください」")).toBe("「코히오쿠다사이」");
    expect(kanaToHangul("  (にゃんこ)  ")).toBe("  (냥코)  ");
  });

  // --------------------
  // weird inputs: isolated small chars
  // --------------------
  it("weird inputs should not crash and keep policy", () => {
    expect(() => kanaToHangul("ゃ")).not.toThrow();
    expect(() => kanaToHangul("ゅ")).not.toThrow();
    expect(() => kanaToHangul("ょ")).not.toThrow();
    expect(() => kanaToHangul("ぁ")).not.toThrow();
    expect(() => kanaToHangul("っ")).not.toThrow();
    expect(kanaToHangul("っ")).toBe("ッ" as any); // 정책: 단독 っ은 "ッ"
  });
});

describe("kanaToHangul - h row (は/ひ/ふ/へ/ほ + ひゃ/ひゅ/ひょ) stress", () => {
  it("basic h-row mapping", () => {
    expect(kanaToHangul("は")).toBe("하");
    expect(kanaToHangul("ひ")).toBe("히");
    expect(kanaToHangul("ふ")).toBe("후");
    expect(kanaToHangul("へ")).toBe("헤");
    expect(kanaToHangul("ほ")).toBe("호");

    expect(kanaToHangul("はひふへほ")).toBe("하히후헤호");
    expect(kanaToHangul("は ひ ふ へ ほ")).toBe("하 히 후 헤 호");
  });

  it("youon: ひゃ/ひゅ/ひょ -> 햐/휴/효", () => {
    expect(kanaToHangul("ひゃ")).toBe("햐");
    expect(kanaToHangul("ひゅ")).toBe("휴");
    expect(kanaToHangul("ひょ")).toBe("효");

    expect(kanaToHangul("ひゃく")).toBe("햐쿠");
    expect(kanaToHangul("ひゅう")).toBe("휴"); // ひゅ + う drop (U_DROP)
    expect(kanaToHangul("ひょう")).toBe("효"); // ひょ + う drop (o+う drop)
  });

  it("h-row + long-vowel-like drops around it", () => {
    expect(kanaToHangul("ほう")).toBe("호"); // おう 계열(o+う drop)
    expect(kanaToHangul("ひょうき")).toBe("효키"); // ひょ + う drop, き keep
    expect(kanaToHangul("ひゅうが")).toBe("휴가"); // う drop + が
    expect(kanaToHangul("はよう")).toBe("하요"); // よう -> よ (o+う drop)
  });

  it("sokuon with h-row (っ + は/ひ/ふ/へ/ほ)", () => {
    // っ + h-행은 보통 ㅅ 받침으로 구현될 것(현 로직 default=ㅅ)
    expect(kanaToHangul("きっは")).toBe("킷하");
    expect(kanaToHangul("きっひ")).toBe("킷히");
    expect(kanaToHangul("きっふ")).toBe("킷후");
    expect(kanaToHangul("きっほ")).toBe("킷호");

    // 요음 앞에서도 안정성
    expect(kanaToHangul("きっひゃ")).toBe("킷햐");
    expect(kanaToHangul("きっひょ")).toBe("킷효");
  });

  it("moraic nasal ん + h-row", () => {
    // ん + は/ひ/ふ/へ/ほ : 기본은 ㄴ 유지
    expect(kanaToHangul("さんは")).toBe("산하"); // (조사 は→わ 휴리스틱이 걸리면 달라질 수 있으니 'さんは'는 사용 금지) -> 그래서 아래처럼 단어 형태로만 테스트
    expect(kanaToHangul("あんひ")).toBe("안히");
    expect(kanaToHangul("しんふ")).toBe("신후");
    expect(kanaToHangul("おきへ")).toBe("오키헤");
    expect(kanaToHangul("こんほ")).toBe("콘호");

    // 요음 뒤 + ん + h-행: 요음 규칙이 ㅇ으로 강제되면 안 됨(현재는 k/g에만 적용)
    expect(kanaToHangul("ひゃんは")).toBe("햔하");
  });

  it("katakana normalization for h-row + youon", () => {
    expect(kanaToHangul("ホ")).toBe("호");
    expect(kanaToHangul("ヒ")).toBe("히");
    expect(kanaToHangul("フ")).toBe("후");
    expect(kanaToHangul("ヘ")).toBe("헤");
    expect(kanaToHangul("ハ")).toBe("하");

    expect(kanaToHangul("ヒャク")).toBe("햐쿠");
    expect(kanaToHangul("ヒョウ")).toBe("효"); // ひょ + う drop
  });

  it("mixed scripts/punctuation around h-row", () => {
    expect(kanaToHangul("（ひゃく）")).toBe("（햐쿠）");
    expect(kanaToHangul("ヒョウ、ヒュウ。")).toBe("효、휴。");
    expect(kanaToHangul("AひB")).toBe("A히B");
  });

  it("direction particle へ -> え should not break nearby h-row mappings", () => {
    // へ as direction marker: え
    expect(kanaToHangul("ほてるへいく")).toBe("호테루에이쿠"); // へ->え, えいく drop 금지
    // 일반 へ는 헤
    expect(kanaToHangul("へや")).toBe("헤야");
  });

  it("topic particle は -> わ should not break 'は/ひ/ふ/へ/ほ' core mapping elsewhere", () => {
    // は as topic marker (휴리스틱이 켜져있다면)
    expect(kanaToHangul("ほはほです")).toBe("호와호데스"); // 가운데 は가 조사로 처리되면 わ로
    // 단독/일반 は는 하
    expect(kanaToHangul("はは")).toBe("하하");
  });
});

describe("particle: へ as 'e' (direction) - verb coverage", () => {
  it("へ + movement verbs (common)", () => {
    // 行く
    expect(kanaToHangul("がっこうへいく")).toBe("각코에이쿠"); // こう -> こ + へ->え + えいく 유지
    // 来る
    expect(kanaToHangul("うちへくる")).toBe("우치에쿠루");
    // 帰る
    expect(kanaToHangul("いえへかえる")).toBe("이에에카에루");
    // 向かう
    expect(kanaToHangul("がっこうへむかう")).toBe("각코에무카우");
    // 進む
    expect(kanaToHangul("まえへすすむ")).toBe("마에에스스무");
    // 出かける
    expect(kanaToHangul("まちへでかける")).toBe("마치에데카케루");
    // 出る
    expect(kanaToHangul("そとへでる")).toBe("소토에데루");
    // 入る
    expect(kanaToHangul("へやへはいる")).toBe("헤야에하이루"); // 첫 へ야는 단어(헤야), 두 번째 へ는 조사(에)
    // 移る
    expect(kanaToHangul("あちらへうつる")).toBe("아치라에우츠루");
    // 渡る
    expect(kanaToHangul("むこうへわたる")).toBe("무코에와타루"); // こう drop
    // 上る
    expect(kanaToHangul("うえへのぼる")).toBe("우에에노보루");
    // 歩く / 走る
    expect(kanaToHangul("あっちへあるく")).toBe("앗치에아루쿠");
    expect(kanaToHangul("あっちへはしる")).toBe("앗치에하시루");
  });

  it("へ without a verb: treat as direction at end/punctuation", () => {
    expect(kanaToHangul("東京(とうきょう)へ！")).toBe("東京(도쿄)에！");
    expect(kanaToHangul("東京(とうきょう)へ")).toBe("東京(도쿄)에");
    expect(kanaToHangul("（とうきょう）へ。")).toBe("（도쿄）에。");
  });

  it("sokuon with h-row (っ + は/ひ/ふ/ほ) - stable", () => {
    expect(kanaToHangul("きっは")).toBe("킷하");
    expect(kanaToHangul("きっひ")).toBe("킷히");
    expect(kanaToHangul("きっふ")).toBe("킷후");
    expect(kanaToHangul("きっほ")).toBe("킷호");
  });

  it("へ as word vs particle - separation", () => {
    expect(kanaToHangul("へや")).toBe("헤야"); // word
    expect(kanaToHangul("がっこうへいく")).toBe("각코에이쿠"); // particle
    expect(kanaToHangul("東京(とうきょう)へ！")).toBe("東京(도쿄)에！"); // particle w/ punctuation
  });
});
describe("kanaToHangul - lexical words ending with へ (must end with 헤)", () => {
  it("archaic/lexical 〜へ words (real)", () => {
    // いにしへ(고어 표기) = 옛날/먼 옛날
    expect(kanaToHangul("いにしへ")).toBe("이니시헤"); // ※ 현대 표기는 보통 いにしえ :contentReference[oaicite:1]{index=1}

    // 沖辺(おきへ) : 바다 쪽/먼바다 쪽 (문어) :contentReference[oaicite:2]{index=2}
    expect(kanaToHangul("おきへ")).toBe("오키헤");

    // 本辺(もとへ) : 밑/근처/기슭 쪽 (문어) :contentReference[oaicite:3]{index=3}
    expect(kanaToHangul("もとへ")).toBe("모토헤");

    // 末辺(すゑへ/すえへ) : 끝/꼭대기 쪽 (문어) :contentReference[oaicite:4]{index=4}
    expect(kanaToHangul("すえへ")).toBe("스에헤");

    // 上辺(かみへ) : 상류/위쪽 (고어) :contentReference[oaicite:5]{index=5}
    expect(kanaToHangul("かみへ")).toBe("카미헤");

    // 国辺(고어로 くにへ) : 나라 쪽/고향 쪽 (고어 표기) :contentReference[oaicite:6]{index=6}
    expect(kanaToHangul("くにへ")).toBe("쿠니헤");

    // 岸辺의 고어 표기 예문에 'きしへ'가 등장 (고어 표기 테스트용) :contentReference[oaicite:7]{index=7}
    expect(kanaToHangul("きしへ")).toBe("키시헤");
  });

  it("must NOT be rewritten as particle へ→え inside these lexical words", () => {
    // 끝이 へ인 단어는 '...에'가 되면 안 됨
    expect(kanaToHangul("おきへ")).not.toBe("오키에");
    expect(kanaToHangul("もとへ")).not.toBe("모토에");
    expect(kanaToHangul("すえへ")).not.toBe("스에에");
    expect(kanaToHangul("かみへ")).not.toBe("카미에");
    expect(kanaToHangul("くにへ")).not.toBe("쿠니에");
  });
});
describe("kanaToHangul - unicode normalization edge cases", () => {
  it("NFD dakuten should behave like NFC", () => {
    // がっこう = がっこう (NFD)
    expect(kanaToHangul("か\u3099っこう")).toBe("각코");
    // ぱ = ぱ (NFD handakuten)
    expect(kanaToHangul("は\u309aん")).toBe("판");
  });

  it("halfwidth katakana should normalize", () => {
    expect(kanaToHangul("ﾊﾝｶｸｶﾀｶﾅ")).toBe("항카쿠카타카나");
  });
});

describe("kanaToHangul - prolonged sound mark variants", () => {
  it("various dash-like marks should be treated like ー (drop)", () => {
    expect(kanaToHangul("みゅｰじっく")).toBe("뮤지쿠"); // 'ｰ' U+FF70
    expect(kanaToHangul("コ―ヒ―")).toBe("코히"); // '―' U+2015
  });
});
describe("kanaToHangul - stray small kana", () => {
  it("stray small kana should not crash and should be pass-through or policy-based", () => {
    expect(() => kanaToHangul("ゃゅょ")).not.toThrow();
    expect(() => kanaToHangul("ぁぃぅぇぉ")).not.toThrow();
    expect(kanaToHangul("ゃ")).toBe("ゃ" as any); // 정책: 그대로 통과(권장)
  });

  it("small kana after non-i-row should not form youon incorrectly", () => {
    // 예: かゃ 같은 건 보통 입력 오류 -> 그대로 처리하거나 최소한 크래시 금지
    expect(() => kanaToHangul("かゃ")).not.toThrow();
  });
});
describe("kanaToHangul - sokuon weird positions", () => {
  it("sokuon at start or after punctuation should not crash", () => {
    expect(() => kanaToHangul("っ")).not.toThrow();
    expect(() => kanaToHangul("！っか")).not.toThrow();
    expect(() => kanaToHangul("「っ」")).not.toThrow();
  });

  it("multiple sokuon should be stable", () => {
    expect(() => kanaToHangul("っっっか")).not.toThrow();
  });
});
describe("kanaToHangul - nasal boundary weirdness", () => {
  it("ん before sokuon should be stable", () => {
    expect(() => kanaToHangul("なんっか")).not.toThrow();
    expect(() => kanaToHangul("こんっちは")).not.toThrow(); // こんにちは 변형 입력
  });

  it("double ん should not produce broken jamo", () => {
    expect(() => kanaToHangul("んん")).not.toThrow();
    expect(() => kanaToHangul("こんんな")).not.toThrow();
  });
});
describe("kanaToHangul - particle false positives", () => {
  it("へ in 'へや' must stay '헤' (not particle)", () => {
    expect(kanaToHangul("へや")).toBe("헤야");
    expect(kanaToHangul("へやへいく")).toBe("헤야에이쿠"); // 첫 へ: 단어, 둘째 へ: 조사
  });

  it("〜のへ pattern should stay '노헤' (placename-like)", () => {
    expect(kanaToHangul("はちのへ")).toBe("하치노헤");
    expect(kanaToHangul("さんのへ")).toBe("산노헤");
  });

  it("lexical …へ must not be rewritten even before punctuation", () => {
    expect(kanaToHangul("いにしへ！")).toBe("이니시헤！");
    expect(kanaToHangul("おきへ。")).toBe("오키헤。");
  });
});
describe("kanaToHangul - loanword hard cases", () => {
  it("combo + sokuon + long mark", () => {
    expect(kanaToHangul("ファッション")).toBe("팟숑"); // っ + しょ + ん(어말) 규칙에 따라 달라질 수 있음
    expect(kanaToHangul("ティッシュー")).toBe("팃슈"); // ー drop
    expect(kanaToHangul("フォー")).toBe("포"); // ー drop
  });
});
describe("kanaToHangul - more edge cases", () => {
  // --------------------
  // Unicode normalization (NFD/NFC) + punctuation preservation
  // --------------------
  it("NFD dakuten/handakuten should work (NFC normalize inside)", () => {
    // がっこう (NFD)
    expect(kanaToHangul("か\u3099っこう")).toBe("각코");
    // ぱん (NFD)
    expect(kanaToHangul("は\u309aん")).toBe("판");
  });

  it("should preserve non-Japanese punctuation/emoji as-is", () => {
    expect(kanaToHangul("いにしへ！")).toBe("이니시헤！"); // 전각 ! 유지
    expect(kanaToHangul("（おはよう）")).toBe("（오하요）"); // 전각 괄호 유지
    expect(kanaToHangul("すごい👍")).toBe("스고이👍"); // 이모지 보존
    expect(kanaToHangul("「へや」")).toBe("「헤야」"); // 단어 へや는 '헤'
  });

  // --------------------
  // Halfwidth katakana: normalize only those chunks
  // --------------------
  it("halfwidth katakana should normalize (and apply nasal assimilation)", () => {
    // ﾊﾝｶｸｶﾀｶﾅ => ハンカクカタカナ
    // ン + カ(k) => ㅇ 느낌 => 항카쿠...
    expect(kanaToHangul("ﾊﾝｶｸｶﾀｶﾅ")).toBe("항카쿠카타카나");
  });

  it("halfwidth with handakuten should normalize too (ﾊﾟ etc.)", () => {
    // ﾊﾟﾝｹｰｷ => パンケーキ
    // ン + ケ(k) => ㅇ => 팡..., ー drop
    expect(kanaToHangul("ﾊﾟﾝｹｰｷ")).toBe("팡케키");
    expect(kanaToHangul("パンケーキ")).toBe("팡케키");
  });

  // --------------------
  // Prolonged sound mark variants
  // --------------------
  it("prolonged-sound variants should behave like ー (drop)", () => {
    // FF70 'ｰ' should be treated like ー (drop)
    expect(kanaToHangul("みゅｰじっく")).toBe("뮤지쿠");
    // U+2015 '―' treated like ー (drop)
    expect(kanaToHangul("コ―ヒ―")).toBe("코히");
  });

  // --------------------
  // Particle false positives (へ)
  // --------------------
  it("へ in a lexical word should stay '헤' even with punctuation", () => {
    expect(kanaToHangul("いにしへ。")).toBe("이니시헤。");
    expect(kanaToHangul("もとへ、")).toBe("모토헤、");
  });

  it("へや must not be rewritten to えや", () => {
    expect(kanaToHangul("へや")).toBe("헤야");
    // first へ(へや)=헤, second へ(particle)=에
    expect(kanaToHangul("へやへいく")).toBe("헤야에이쿠");
  });

  it("〜のへ should be protected as placename-like (optional policy)", () => {
    expect(kanaToHangul("はちのへ")).toBe("하치노헤");
    expect(kanaToHangul("さんのへ")).toBe("산노헤");
  });

  // --------------------
  // ん assimilation torture (k/g, p/b/m, vowel boundary)
  // --------------------
  it("ん before k/g should lean to ㅇ (NG)", () => {
    expect(kanaToHangul("しんがぽーる")).toBe("싱가포루"); // ん+が => ㅇ, ー drop
    expect(kanaToHangul("りんぐ")).toBe("링구"); // ん+ぐ
    expect(kanaToHangul("あんこ")).toBe("앙코"); // ん+こ
  });

  it("ん before p/b/m should become ㅁ (M) except vowelOnly policy", () => {
    expect(kanaToHangul("しんぱい")).toBe("심파이"); // ん+ぱ => ㅁ
    expect(kanaToHangul("さんぷる")).toBe("삼푸루"); // ん+ぷ => ㅁ
    expect(kanaToHangul("しんぶん")).toBe("심분"); // ん+ぶ => ㅁ
  });

  it("ん before vowel/y/w should stay ㄴ (N)", () => {
    expect(kanaToHangul("てんいん")).toBe("텐인");
    expect(kanaToHangul("かんおん")).toBe("칸온");
    expect(kanaToHangul("まんいち")).toBe("만이치");
  });

  // --------------------
  // Small kana / weird sequences robustness
  // --------------------
  it("stray small kana should not crash and should be pass-through (policy)", () => {
    expect(() => kanaToHangul("ゃ")).not.toThrow();
    expect(() => kanaToHangul("ゅ")).not.toThrow();
    expect(() => kanaToHangul("ょ")).not.toThrow();
    expect(() => kanaToHangul("ぁぃぅぇぉ")).not.toThrow();

    // 정책: 단독 small kana는 그대로 통과(원하면 바꿔도 됨)
    expect(kanaToHangul("ゃ")).toBe("ゃ" as any);
  });

  it("iteration marks should not crash (usually pass-through)", () => {
    expect(() => kanaToHangul("ゝゞヽヾ")).not.toThrow();
    expect(kanaToHangul("ゝゞ")).toBe("ゝゞ" as any);
  });

  // --------------------
  // Stress: long input should not hang (no infinite loops)
  // --------------------
  it("long repeated input should finish", () => {
    const s = "がっこうへいく。".repeat(200); // 적당히 길게
    expect(() => kanaToHangul(s)).not.toThrow();
  });

  it("output should not contain combining dakuten/handakuten", () => {
    const out = kanaToHangul("か\u3099っこう は\u309aん");
    expect(out).not.toMatch(/[\u3099\u309A]/);
  });
});
