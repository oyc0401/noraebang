// test/kanaToHangul.test.ts
import {
  buildTokenizer,
  kanaToHangulWithTokenizer,
  Tokenizer,
} from "./kanaToHangul";

let tk: Tokenizer;

beforeAll(async () => {
  tk = await buildTokenizer();
});

describe("kanaToHangul", () => {
  it("basic hiragana", () => {
    expect(kanaToHangulWithTokenizer("さようなら", tk)).toBe("사요나라"); // おう/よう 장음은 제거
    expect(kanaToHangulWithTokenizer("ありがとう", tk)).toBe("아리가토"); // とう -> と
    expect(kanaToHangulWithTokenizer("おはよう", tk)).toBe("오하요"); // よう -> よ
  });

  it("youon (きゃ/しゅ/ちょ)", () => {
    expect(kanaToHangulWithTokenizer("きゃく", tk)).toBe("캬쿠");
    expect(kanaToHangulWithTokenizer("しゅくだい", tk)).toBe("슈쿠다이");
    expect(kanaToHangulWithTokenizer("ちょっと", tk)).toBe("춋토");
    expect(kanaToHangulWithTokenizer("きゅう", tk)).toBe("큐"); // きゅ + う drop
    expect(kanaToHangulWithTokenizer("きょう", tk)).toBe("쿄"); // きょ + う drop
    expect(kanaToHangulWithTokenizer("しょくどう", tk)).toBe("쇼쿠도"); // どう -> ど
    expect(kanaToHangulWithTokenizer("にゃん", tk)).toBe("냥");
    expect(kanaToHangulWithTokenizer("にゅうがく", tk)).toBe("뉴가쿠"); // う drop
    expect(kanaToHangulWithTokenizer("みゅーじっく", tk)).toBe("뮤지쿠"); // ー drop
    expect(kanaToHangulWithTokenizer("びょういん", tk)).toBe("뵤인"); // びょ + う drop
    expect(kanaToHangulWithTokenizer("ぴょん", tk)).toBe("푱"); // ん 규칙 결합
    expect(kanaToHangulWithTokenizer("りょこう", tk)).toBe("료코"); // こう -> こ
  });

  it("sokuon (small っ)", () => {
    expect(kanaToHangulWithTokenizer("かった", tk)).toBe("캇타");
    expect(kanaToHangulWithTokenizer("きって", tk)).toBe("킷테");
    expect(kanaToHangulWithTokenizer("いって", tk)).toBe("잇테");
    expect(kanaToHangulWithTokenizer("がっこう", tk)).toBe("각코"); // こう -> こ
    expect(kanaToHangulWithTokenizer("ろっく", tk)).toBe("록쿠");
    expect(kanaToHangulWithTokenizer("けっこん", tk)).toBe("켓콘");
    expect(kanaToHangulWithTokenizer("ざっし", tk)).toBe("잣시");
    expect(kanaToHangulWithTokenizer("きっぷ", tk)).toBe("킵푸");
    expect(kanaToHangulWithTokenizer("まっすぐ", tk)).toBe("맛스구");
  });

  it("drop long-vowel-like markers (おう/よう/えい)", () => {
    expect(kanaToHangulWithTokenizer("さようなら", tk)).toBe("사요나라"); // よ + [う drop]
    expect(kanaToHangulWithTokenizer("せんせい", tk)).toBe("센세"); // せ + [い drop]
    expect(kanaToHangulWithTokenizer("おおきい", tk)).toBe("오키"); // おお -> お, きい -> き
    expect(kanaToHangulWithTokenizer("おねえさん", tk)).toBe("오네상"); // ねえ -> ね
    expect(kanaToHangulWithTokenizer("えいご", tk)).toBe("에고"); // えい -> え
    expect(kanaToHangulWithTokenizer("けいさつ", tk)).toBe("케사츠"); // けい -> け
  });

  it("katakana normalization + ー", () => {
    expect(kanaToHangulWithTokenizer("カタカナ", tk)).toBe("카타카나");
    expect(kanaToHangulWithTokenizer("コーヒー", tk)).toBe("코히");
  });

  it("katakana loanword combos (ティ/ファ/フォ etc.)", () => {
    expect(kanaToHangulWithTokenizer("パーティー", tk)).toBe("파티");
    expect(kanaToHangulWithTokenizer("ティッシュ", tk)).toBe("팃슈");
    expect(kanaToHangulWithTokenizer("フォーク", tk)).toBe("포쿠");
  });

  it("dakuten/handakuten basics", () => {
    expect(kanaToHangulWithTokenizer("がくせい", tk)).toBe("가쿠세"); // せい -> せ
    expect(kanaToHangulWithTokenizer("ぐんたい", tk)).toBe("군타이");
    expect(kanaToHangulWithTokenizer("げんき", tk)).toBe("겡키");
    expect(kanaToHangulWithTokenizer("ごはん", tk)).toBe("고한");
  });

  it("unknown chars pass-through", () => {
    expect(kanaToHangulWithTokenizer("誕生日(たんじょうび)", tk)).toBe(
      "誕生日(탄죠비)",
    );
    expect(kanaToHangulWithTokenizer("第3回(だいさんかい)", tk)).toBe(
      "第3回(다이상카이)",
    );
    expect(kanaToHangulWithTokenizer("!?(びっくり)", tk)).toBe("!?(빗쿠리)");
  });

  it("특별 사전 매핑 (따로 처리)", () => {
    expect(kanaToHangulWithTokenizer("とうきょう", tk)).toBe("도쿄");
  });

  it("ん 변형", () => {
    expect(kanaToHangulWithTokenizer("あいみょん", tk)).toBe("아이묭");
    expect(kanaToHangulWithTokenizer("いんまん", tk)).toBe("인만");
    expect(kanaToHangulWithTokenizer("あれくん", tk)).toBe("아레쿤");
    expect(kanaToHangulWithTokenizer("りろん", tk)).toBe("리론");
    expect(kanaToHangulWithTokenizer("りんね", tk)).toBe("린네");
    expect(kanaToHangulWithTokenizer("りんご", tk)).toBe("링고");
    expect(kanaToHangulWithTokenizer("さんぽ", tk)).toBe("삼포"); // ん->ㅁ
    expect(kanaToHangulWithTokenizer("しんぶん", tk)).toBe("심분"); // ん->ㅁ
    expect(kanaToHangulWithTokenizer("てんぷら", tk)).toBe("템푸라"); // ん->ㅁ
    expect(kanaToHangulWithTokenizer("かんぱい", tk)).toBe("캄파이"); // ん->ㅁ
    expect(kanaToHangulWithTokenizer("しんまい", tk)).toBe("심마이"); // ん->ㅁ
    expect(kanaToHangulWithTokenizer("まんいち", tk)).toBe("만이치"); // 모음 앞이면 ㄴ 유지
    expect(kanaToHangulWithTokenizer("てんいん", tk)).toBe("텐인");
    expect(kanaToHangulWithTokenizer("かんおん", tk)).toBe("칸온");
    expect(kanaToHangulWithTokenizer("げんき", tk)).toBe("겡키");
    expect(kanaToHangulWithTokenizer("あんがい", tk)).toBe("앙가이"); // ん + が(velar) -> ㅇ 느낌
    expect(kanaToHangulWithTokenizer("りんかい", tk)).toBe("링카이");
    expect(kanaToHangulWithTokenizer("ほんと", tk)).toBe("혼토");
    expect(kanaToHangulWithTokenizer("にゃんこ", tk)).toBe("냥코"); // にゃ + ん + こ
  });

  it("ちゃん", () => {
    expect(kanaToHangulWithTokenizer("めいちゃん", tk)).toBe("메이쨩");
    expect(kanaToHangulWithTokenizer("あかちゃん", tk)).toBe("아카쨩");
    expect(kanaToHangulWithTokenizer("おじいちゃん", tk)).toBe("오지쨩"); // じい drop
    expect(kanaToHangulWithTokenizer("ねえちゃん", tk)).toBe("네쨩"); // ねえ drop
    expect(kanaToHangulWithTokenizer("みっちゃん", tk)).toBe("밋쨩");
    expect(kanaToHangulWithTokenizer("まーちゃん", tk)).toBe("마쨩");
  });

  it("つ", () => {
    expect(kanaToHangulWithTokenizer("つき", tk)).toBe("츠키");
  });

  it("장음 아닌것", () => {
    expect(kanaToHangulWithTokenizer("せいな", tk)).toBe("세이나");
    expect(kanaToHangulWithTokenizer("せいか", tk)).toBe("세이카");
    expect(kanaToHangulWithTokenizer("けいと", tk)).toBe("케이토");
    expect(kanaToHangulWithTokenizer("れいな", tk)).toBe("레이나");
    expect(kanaToHangulWithTokenizer("めいこ", tk)).toBe("메이코");
    expect(kanaToHangulWithTokenizer("えいこ", tk)).toBe("에이코");
    expect(kanaToHangulWithTokenizer("こい", tk)).toBe("코이"); // 단순 こ + い
    expect(kanaToHangulWithTokenizer("あい", tk)).toBe("아이");
    expect(kanaToHangulWithTokenizer("うい", tk)).toBe("우이");
    expect(kanaToHangulWithTokenizer("おいしい", tk)).toBe("오이시이"); // しい는 요음 아님
    expect(kanaToHangulWithTokenizer("おいで", tk)).toBe("오이데");
  });

  it("edge: mixed scripts + spacing/punctuation", () => {
    expect(kanaToHangulWithTokenizer("コーヒー, ください。", tk)).toBe(
      "코히, 쿠다사이。",
    );
    expect(kanaToHangulWithTokenizer("「きょう」", tk)).toBe("「쿄」");
    expect(kanaToHangulWithTokenizer("（がっこう）", tk)).toBe("（각코）");
    expect(kanaToHangulWithTokenizer("  すし  ", tk)).toBe("  스시  ");
  });

  // ====================
  // Grammar/pronunciation edge cases
  // ====================

  describe("grammar pronunciation edge cases (enable when rules are implemented)", () => {
    it("particle: は as 'wa' when used as topic marker", () => {
      expect(kanaToHangulWithTokenizer("わたしはがくせいです", tk)).toBe(
        "와타시와가쿠세데스",
      ); // せい drop
      expect(kanaToHangulWithTokenizer("これはペンです", tk)).toBe(
        "코레와펜데스",
      );
      expect(kanaToHangulWithTokenizer("きょうはあつい", tk)).toBe(
        "쿄와아츠이",
      ); // きょう -> きょ
      expect(kanaToHangulWithTokenizer("こんにちは", tk)).toBe("콘니치와"); // 実発音
    });

    it("particle: へ as 'e' when used as direction marker", () => {
      expect(kanaToHangulWithTokenizer("がっこうへいく", tk)).toBe(
        "각코에이쿠",
      ); // こう drop
      expect(kanaToHangulWithTokenizer("うちへかえる", tk)).toBe(
        "우치에카에루",
      );
    });

    it("particle: を as 'o' when used as object marker", () => {
      expect(kanaToHangulWithTokenizer("すしをたべる", tk)).toBe(
        "스시오타베루",
      );
      expect(kanaToHangulWithTokenizer("みずをのむ", tk)).toBe("미즈오노무");
    });
  });

  it("grammar: quotation particle って / った / ってば (sokuon across morpheme boundary)", () => {
    expect(kanaToHangulWithTokenizer("だって", tk)).toBe("닷테");
    expect(kanaToHangulWithTokenizer("って", tk)).toBe("ッテ" as any); // 구현이 단독 っ 처리 못 하면 pass-through 가능: 정책 정해서 고치세요
    expect(kanaToHangulWithTokenizer("ってば", tk)).toBe("ッテ바" as any);
    expect(kanaToHangulWithTokenizer("いった", tk)).toBe("잇타");
    expect(kanaToHangulWithTokenizer("おもった", tk)).toBe("오못타");
  });

  it("grammar: contractions じゃ / ちゃ / じゃない / ちゃう / ちゃった", () => {
    // では → じゃ (dewa → ja)
    expect(kanaToHangulWithTokenizer("それじゃ", tk)).toBe("소레쟈");
    expect(kanaToHangulWithTokenizer("じゃない", tk)).toBe("쟈나이");
    expect(kanaToHangulWithTokenizer("じゃなかった", tk)).toBe("쟈나캇타");

    // ては → ちゃ (tewa → cha)
    expect(kanaToHangulWithTokenizer("たべちゃう", tk)).toBe("타베챠우"); // う drop 정책이면 타베챠
    expect(kanaToHangulWithTokenizer("みちゃった", tk)).toBe("미챳타");
    expect(kanaToHangulWithTokenizer("しちゃう", tk)).toBe("시챠우"); // う drop 정책이면 시챠
    expect(kanaToHangulWithTokenizer("やっちゃった", tk)).toBe("얏챳타");
  });

  it("grammar: polite/auxiliary long-vowel-like endings (でしょう / ましょう / ましょうか)", () => {
    // でしょう: でしょ + う(drop) = でしょ
    expect(kanaToHangulWithTokenizer("そうでしょう", tk)).toBe("소데쇼");
    expect(kanaToHangulWithTokenizer("いいでしょうか", tk)).toBe("이데쇼카");
    // ましょう: ましょ + う(drop) = ましょ
    expect(kanaToHangulWithTokenizer("いきましょう", tk)).toBe("이키마쇼");
    expect(kanaToHangulWithTokenizer("やりましょうか", tk)).toBe("야리마쇼카");
  });

  it("grammar: ている / ておく / てしまう (don't accidentally treat てい as long-vowel drop)", () => {
    // ている는 '테이루'가 자연스럽고, てい를 장음처럼 날려버리면 체감 품질 급락
    expect(kanaToHangulWithTokenizer("たべている", tk)).toBe("타베테이루");
    expect(kanaToHangulWithTokenizer("みている", tk)).toBe("미테이루");
    expect(kanaToHangulWithTokenizer("している", tk)).toBe("시테이루");

    // ておく(=해 두다): おう/えい 룰과 혼동 없는지
    expect(kanaToHangulWithTokenizer("かっておく", tk)).toBe("캇테오쿠");
    expect(kanaToHangulWithTokenizer("やっておく", tk)).toBe("얏테오쿠");

    // てしまう: 축약(ちゃう)랑 같이 있을 때도 안정적으로
    expect(kanaToHangulWithTokenizer("たべてしまう", tk)).toBe("타베테시마우"); // う drop 정책이면 타베테시마
    expect(kanaToHangulWithTokenizer("やってしまった", tk)).toBe("얏테시맛타");
  });

  it("grammar: んです / なんです / なんですか (moraic nasal + です)", () => {
    expect(kanaToHangulWithTokenizer("そうなんです", tk)).toBe("소난데스");
    expect(kanaToHangulWithTokenizer("なんですか", tk)).toBe("난데스카");
    expect(kanaToHangulWithTokenizer("だめなんです", tk)).toBe("다메난데스");
    expect(kanaToHangulWithTokenizer("しんぱいなんです", tk)).toBe(
      "심파이난데스",
    ); // ん->ㅁ before ぱ
  });

  it("grammar: negative forms with ない / なかった (sokuon + negative)", () => {
    expect(kanaToHangulWithTokenizer("いかない", tk)).toBe("이카나이");
    expect(kanaToHangulWithTokenizer("たべない", tk)).toBe("타베나이");
    expect(kanaToHangulWithTokenizer("しない", tk)).toBe("시나이");
    expect(kanaToHangulWithTokenizer("いかなかった", tk)).toBe("이카나캇타");
    expect(kanaToHangulWithTokenizer("たべなかった", tk)).toBe("타베나캇타");
    expect(kanaToHangulWithTokenizer("しなかった", tk)).toBe("시나캇타");
  });

  it("grammar: conditionals たら / なら / ても (sokuon boundary stability)", () => {
    expect(kanaToHangulWithTokenizer("いったら", tk)).toBe("잇타라");
    expect(kanaToHangulWithTokenizer("やったら", tk)).toBe("얏타라");
    expect(kanaToHangulWithTokenizer("かったら", tk)).toBe("캇타라");

    expect(kanaToHangulWithTokenizer("いくなら", tk)).toBe("이쿠나라");
    expect(kanaToHangulWithTokenizer("するなら", tk)).toBe("스루나라");

    expect(kanaToHangulWithTokenizer("いっても", tk)).toBe("잇테모");
    expect(kanaToHangulWithTokenizer("やっても", tk)).toBe("얏테모");
  });

  it("grammar: question/ending particles (ね/よ/かな/かい) keep them intact", () => {
    expect(kanaToHangulWithTokenizer("いいね", tk)).toBe("이이네");
    expect(kanaToHangulWithTokenizer("いいよ", tk)).toBe("이이요");
    expect(kanaToHangulWithTokenizer("いいかな", tk)).toBe("이이카나");
    expect(kanaToHangulWithTokenizer("いいかい", tk)).toBe("이이카이");
    expect(kanaToHangulWithTokenizer("いく？", tk)).toBe("이쿠？");
  });

  it("grammar: small っ at start or isolated should not crash (policy check)", () => {
    // 이런 입력은 보통 비정상이지만, 라이브러리는 크래시 없이 정책대로 처리해야 함
    expect(() => kanaToHangulWithTokenizer("っ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("っあ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("っか", tk)).not.toThrow();
  });

  it("grammar: consecutive long-vowel-like patterns should be stable", () => {
    expect(kanaToHangulWithTokenizer("おおおお", tk)).toBe("오");
    expect(kanaToHangulWithTokenizer("えいえい", tk)).toBe("에에"); // 각 えい -> え
    expect(kanaToHangulWithTokenizer("ようよう", tk)).toBe("요요"); // 각 よう -> よ
    expect(kanaToHangulWithTokenizer("こうこう", tk)).toBe("코코"); // 각 こう -> こ
  });

  it("grammar: tricky boundaries with ん + youon/sokuon", () => {
    expect(kanaToHangulWithTokenizer("しんゆう", tk)).toBe("신유"); // ゆう drop
    expect(kanaToHangulWithTokenizer("てんきゃく", tk)).toBe("텡캬쿠"); // ん + きゃ
    expect(kanaToHangulWithTokenizer("さんちょく", tk)).toBe("산쵸쿠"); // ん + ちょ
    expect(kanaToHangulWithTokenizer("まんちょっと", tk)).toBe("만춋토"); // ん + ちょっ
  });
});

describe("kanaToHangul2", () => {
  it("basic hiragana", () => {
    expect(kanaToHangulWithTokenizer("ようこそ", tk)).toBe("요코소"); // よう -> よ
    expect(kanaToHangulWithTokenizer("おめでとう", tk)).toBe("오메데토"); // とう -> と
    expect(kanaToHangulWithTokenizer("おはようさん", tk)).toBe("오하요상"); // よう -> よ, さん -> 상(관용)
  });

  it("youon (きゃ/しゅ/ちょ)", () => {
    expect(kanaToHangulWithTokenizer("きゃんぷ", tk)).toBe("캼푸"); // きゃ + ん(ㅁ before ぷ) + ぷ
    expect(kanaToHangulWithTokenizer("しゅっぱつ", tk)).toBe("슙파츠"); // しゅ + っ(ㅂ before ぱ) + ぱつ
    expect(kanaToHangulWithTokenizer("ちょっぴり", tk)).toBe("춉피리"); // ちょ + っ(ㅂ before ぴ) + ぴり
    expect(kanaToHangulWithTokenizer("ぎゅう", tk)).toBe("규"); // ぎゅ + う drop
    expect(kanaToHangulWithTokenizer("りょう", tk)).toBe("료"); // りょ + う drop
    expect(kanaToHangulWithTokenizer("ちょうど", tk)).toBe("쵸도"); // ちょ + う drop
    expect(kanaToHangulWithTokenizer("にゃんこ", tk)).toBe("냥코"); // にゃ + ん + こ
    expect(kanaToHangulWithTokenizer("りゅうがく", tk)).toBe("류가쿠"); // りゅ + う drop
    expect(kanaToHangulWithTokenizer("にゅーす", tk)).toBe("뉴스"); // ー drop
    expect(kanaToHangulWithTokenizer("びょうき", tk)).toBe("뵤키"); // びょ + う drop
    expect(kanaToHangulWithTokenizer("にょん", tk)).toBe("뇽"); // 요음 + ん(어말) => ㅇ
    expect(kanaToHangulWithTokenizer("ぎょこう", tk)).toBe("교코"); // こう -> こ
  });

  it("sokuon (small っ)", () => {
    expect(kanaToHangulWithTokenizer("さっき", tk)).toBe("삭키");
    expect(kanaToHangulWithTokenizer("まって", tk)).toBe("맛테");
    expect(kanaToHangulWithTokenizer("のって", tk)).toBe("놋테");
    expect(kanaToHangulWithTokenizer("けっこう", tk)).toBe("켓코"); // こう -> こ
    expect(kanaToHangulWithTokenizer("まっく", tk)).toBe("막쿠");
    expect(kanaToHangulWithTokenizer("ざっか", tk)).toBe("작카");
    expect(kanaToHangulWithTokenizer("さっし", tk)).toBe("삿시");
    expect(kanaToHangulWithTokenizer("しっぽ", tk)).toBe("십포");
    expect(kanaToHangulWithTokenizer("まっさか", tk)).toBe("맛사카");
  });

  it("drop long-vowel-like markers (おう/よう/えい)", () => {
    expect(kanaToHangulWithTokenizer("ようふく", tk)).toBe("요후쿠"); // よう -> よ
    expect(kanaToHangulWithTokenizer("せいふく", tk)).toBe("세후쿠"); // せい -> せ
    expect(kanaToHangulWithTokenizer("おおきいな", tk)).toBe("오키이나"); // おお -> お,
    expect(kanaToHangulWithTokenizer("ねえさん", tk)).toBe("네상"); // ねえ -> ね, さん -> 상
    expect(kanaToHangulWithTokenizer("えいが", tk)).toBe("에가"); // えい -> え
    expect(kanaToHangulWithTokenizer("けいかく", tk)).toBe("케카쿠"); // けい -> け
  });

  it("katakana normalization + ー", () => {
    expect(kanaToHangulWithTokenizer("テレビ", tk)).toBe("테레비");
    expect(kanaToHangulWithTokenizer("ジュース", tk)).toBe("쥬스"); // ー 없음, normalize + 요음 그대로
  });

  it("katakana loanword combos (ティ/ファ/フォ etc.)", () => {
    expect(kanaToHangulWithTokenizer("ティー", tk)).toBe("티"); // ー drop
    expect(kanaToHangulWithTokenizer("ファイル", tk)).toBe("파이루"); // ふぁ + い + る
    expect(kanaToHangulWithTokenizer("フォト", tk)).toBe("포토"); // ふぉ + と
  });

  it("dakuten/handakuten basics", () => {
    expect(kanaToHangulWithTokenizer("ぎんこう", tk)).toBe("깅코"); // こう -> こ
    expect(kanaToHangulWithTokenizer("げんだい", tk)).toBe("겐다이");
    expect(kanaToHangulWithTokenizer("ごぜん", tk)).toBe("고젠");
    expect(kanaToHangulWithTokenizer("ばくはつ", tk)).toBe("바쿠하츠");
  });

  it("unknown chars pass-through", () => {
    expect(kanaToHangulWithTokenizer("記録(きろく)", tk)).toBe("記録(키로쿠)");
    expect(kanaToHangulWithTokenizer("第2章(だいにしょう)", tk)).toBe(
      "第2章(다이니쇼)",
    );
    expect(kanaToHangulWithTokenizer("!?(まっか)", tk)).toBe("!?(막카)");
  });

  it("특별 사전 매핑 (따로 처리)", () => {
    expect(kanaToHangulWithTokenizer("とうきょう", tk)).toBe("도쿄");
  });

  it("ん 변형", () => {
    expect(kanaToHangulWithTokenizer("しょん", tk)).toBe("숑"); // 요음 + ん(어말) => ㅇ
    expect(kanaToHangulWithTokenizer("うんまん", tk)).toBe("운만"); // 모음 단독(う) 뒤 ん + ま => ㄴ 유지
    expect(kanaToHangulWithTokenizer("たろうくん", tk)).toBe("타로쿤"); // ろう -> ろ, くん
    expect(kanaToHangulWithTokenizer("かろん", tk)).toBe("카론"); // …ろん
    expect(kanaToHangulWithTokenizer("ほんね", tk)).toBe("혼네"); // ん + ね
    expect(kanaToHangulWithTokenizer("まんが", tk)).toBe("망가"); // ん + が => ㅇ
    expect(kanaToHangulWithTokenizer("さんぷる", tk)).toBe("삼푸루"); // ん->ㅁ before ぷ
    expect(kanaToHangulWithTokenizer("しんぱん", tk)).toBe("심판"); // ん->ㅁ before ぱ, 그리고 ぱん(어말 ん) => 판
    expect(kanaToHangulWithTokenizer("てんぷき", tk)).toBe("템푸키"); // ん->ㅁ before ぷ
    expect(kanaToHangulWithTokenizer("かんぱく", tk)).toBe("캄파쿠"); // ん->ㅁ before ぱ
    expect(kanaToHangulWithTokenizer("まんい", tk)).toBe("만이"); // 모음 앞이면 ㄴ 유지
    expect(kanaToHangulWithTokenizer("てんいき", tk)).toBe("텐이키"); // 모음 앞 ㄴ 유지
    expect(kanaToHangulWithTokenizer("かんおと", tk)).toBe("칸오토"); // 모음 앞 ㄴ 유지
    expect(kanaToHangulWithTokenizer("あんがく", tk)).toBe("앙가쿠"); // ん + が => ㅇ
    expect(kanaToHangulWithTokenizer("りんこう", tk)).toBe("링코"); // r + (k/g) => ㅇ + こう drop
    expect(kanaToHangulWithTokenizer("ほんとに", tk)).toBe("혼토니");
  });

  it("ちゃん", () => {
    expect(kanaToHangulWithTokenizer("れいちゃん", tk)).toBe("레이쨩");
    expect(kanaToHangulWithTokenizer("みかちゃん", tk)).toBe("미카쨩");
    expect(kanaToHangulWithTokenizer("じいちゃん", tk)).toBe("지쨩"); // じい drop
    expect(kanaToHangulWithTokenizer("おねえちゃん", tk)).toBe("오네쨩"); // ねえ drop
    expect(kanaToHangulWithTokenizer("りっちゃん", tk)).toBe("릿쨩");
    expect(kanaToHangulWithTokenizer("さーちゃん", tk)).toBe("사쨩"); // ー drop
  });

  it("つ", () => {
    expect(kanaToHangulWithTokenizer("つめ", tk)).toBe("츠메");
  });

  it("장음 아닌것", () => {
    expect(kanaToHangulWithTokenizer("せいな", tk)).toBe("세이나");
    expect(kanaToHangulWithTokenizer("せいか", tk)).toBe("세이카");
    expect(kanaToHangulWithTokenizer("けいと", tk)).toBe("케이토");
    expect(kanaToHangulWithTokenizer("れいな", tk)).toBe("레이나");
    expect(kanaToHangulWithTokenizer("めいこ", tk)).toBe("메이코");
    expect(kanaToHangulWithTokenizer("えいこ", tk)).toBe("에이코");
    expect(kanaToHangulWithTokenizer("こい", tk)).toBe("코이");
    expect(kanaToHangulWithTokenizer("あい", tk)).toBe("아이");
    expect(kanaToHangulWithTokenizer("うい", tk)).toBe("우이");
    expect(kanaToHangulWithTokenizer("おいしい", tk)).toBe("오이시이");
    expect(kanaToHangulWithTokenizer("おいで", tk)).toBe("오이데");
  });

  it("edge: mixed scripts + spacing/punctuation", () => {
    expect(kanaToHangulWithTokenizer("ジュース, おねがい。", tk)).toBe(
      "쥬스, 오네가이。",
    );
    expect(kanaToHangulWithTokenizer("「りょう」", tk)).toBe("「료」");
    expect(kanaToHangulWithTokenizer("（けっこう）", tk)).toBe("（켓코）");
    expect(kanaToHangulWithTokenizer("  たこ  ", tk)).toBe("  타코  ");
  });

  // ====================
  // Grammar/pronunciation edge cases
  // ====================

  describe("grammar pronunciation edge cases (enable when rules are implemented)", () => {
    it("particle: は as 'wa' when used as topic marker", () => {
      expect(kanaToHangulWithTokenizer("あなたはせいふくです", tk)).toBe(
        "아나타와세후쿠데스",
      ); // せい drop
      expect(kanaToHangulWithTokenizer("それはノートです", tk)).toBe(
        "소레와노토데스",
      ); // ー drop
      expect(kanaToHangulWithTokenizer("あしたはさむい", tk)).toBe(
        "아시타와사무이",
      );
      expect(kanaToHangulWithTokenizer("こんにちは", tk)).toBe("콘니치와"); // 実発音
    });

    it("particle: へ as 'e' when used as direction marker", () => {
      expect(kanaToHangulWithTokenizer("としょかんへいく", tk)).toBe(
        "토쇼칸에이쿠",
      ); // へ->え, えいく drop 금지
      expect(kanaToHangulWithTokenizer("いえへかえる", tk)).toBe(
        "이에에카에루",
      );
    });

    it("particle: を as 'o' when used as object marker", () => {
      expect(kanaToHangulWithTokenizer("パンをたべる", tk)).toBe("판오타베루");
      expect(kanaToHangulWithTokenizer("みずをのむ", tk)).toBe("미즈오노무");
    });
  });

  it("grammar: quotation particle って / った / ってば (sokuon across morpheme boundary)", () => {
    expect(kanaToHangulWithTokenizer("だってさ", tk)).toBe("닷테사");
    expect(kanaToHangulWithTokenizer("って", tk)).toBe("ッテ" as any);
    expect(kanaToHangulWithTokenizer("ってば", tk)).toBe("ッテ바" as any);
    expect(kanaToHangulWithTokenizer("やった", tk)).toBe("얏타");
    expect(kanaToHangulWithTokenizer("しった", tk)).toBe("싯타");
  });

  it("grammar: contractions じゃ / ちゃ / じゃない / ちゃう / ちゃった", () => {
    // では → じゃ (dewa → ja)
    expect(kanaToHangulWithTokenizer("ここじゃ", tk)).toBe("코코쟈");
    expect(kanaToHangulWithTokenizer("ここじゃない", tk)).toBe("코코쟈나이");
    expect(kanaToHangulWithTokenizer("ほんとじゃなかった", tk)).toBe(
      "혼토쟈나캇타",
    );

    // ては → ちゃ (tewa → cha)
    expect(kanaToHangulWithTokenizer("いっちゃう", tk)).toBe("잇챠우");
    expect(kanaToHangulWithTokenizer("かっちゃった", tk)).toBe("캇챳타");
    expect(kanaToHangulWithTokenizer("やっちゃう", tk)).toBe("얏챠우");
    expect(kanaToHangulWithTokenizer("いっちゃった", tk)).toBe("잇챳타");
  });

  it("grammar: polite/auxiliary long-vowel-like endings (でしょう / ましょう / ましょうか)", () => {
    expect(kanaToHangulWithTokenizer("いやでしょう", tk)).toBe("이야데쇼");
    expect(kanaToHangulWithTokenizer("だめでしょうか", tk)).toBe("다메데쇼카");
    expect(kanaToHangulWithTokenizer("のみましょう", tk)).toBe("노미마쇼");
    expect(kanaToHangulWithTokenizer("かえりましょうか", tk)).toBe(
      "카에리마쇼카",
    );
  });

  it("grammar: ている / ておく / てしまう (don't accidentally treat てい as long-vowel drop)", () => {
    expect(kanaToHangulWithTokenizer("よんでいる", tk)).toBe("욘데이루");
    expect(kanaToHangulWithTokenizer("はなしている", tk)).toBe("하나시테이루");
    expect(kanaToHangulWithTokenizer("まっている", tk)).toBe("맛테이루");

    expect(kanaToHangulWithTokenizer("とっておく", tk)).toBe("톳테오쿠");
    expect(kanaToHangulWithTokenizer("うっておく", tk)).toBe("웃테오쿠");

    expect(kanaToHangulWithTokenizer("のんでしまう", tk)).toBe("논데시마우");
    expect(kanaToHangulWithTokenizer("いってしまった", tk)).toBe("잇테시맛타");
  });

  it("grammar: んです / なんです / なんですか (moraic nasal + です)", () => {
    expect(kanaToHangulWithTokenizer("そうなんです", tk)).toBe("소난데스");
    expect(kanaToHangulWithTokenizer("なんですか", tk)).toBe("난데스카");
    expect(kanaToHangulWithTokenizer("むりなんです", tk)).toBe("무리난데스");
    expect(kanaToHangulWithTokenizer("しんぱいなんです", tk)).toBe(
      "심파이난데스",
    );
  });

  it("grammar: negative forms with ない / なかった (sokuon + negative)", () => {
    expect(kanaToHangulWithTokenizer("いかない", tk)).toBe("이카나이");
    expect(kanaToHangulWithTokenizer("のまない", tk)).toBe("노마나이");
    expect(kanaToHangulWithTokenizer("いわない", tk)).toBe("이와나이");
    expect(kanaToHangulWithTokenizer("いかなかった", tk)).toBe("이카나캇타");
    expect(kanaToHangulWithTokenizer("のまなかった", tk)).toBe("노마나캇타");
    expect(kanaToHangulWithTokenizer("いわなかった", tk)).toBe("이와나캇타");
  });

  it("grammar: conditionals たら / なら / ても (sokuon boundary stability)", () => {
    expect(kanaToHangulWithTokenizer("やったら", tk)).toBe("얏타라");
    expect(kanaToHangulWithTokenizer("いったら", tk)).toBe("잇타라");
    expect(kanaToHangulWithTokenizer("まったら", tk)).toBe("맛타라");

    expect(kanaToHangulWithTokenizer("いくなら", tk)).toBe("이쿠나라");
    expect(kanaToHangulWithTokenizer("のむなら", tk)).toBe("노무나라");

    expect(kanaToHangulWithTokenizer("いっても", tk)).toBe("잇테모");
    expect(kanaToHangulWithTokenizer("やっても", tk)).toBe("얏테모");
  });

  it("grammar: question/ending particles (ね/よ/かな/かい) keep them intact", () => {
    expect(kanaToHangulWithTokenizer("いいね", tk)).toBe("이이네");
    expect(kanaToHangulWithTokenizer("いいよ", tk)).toBe("이이요");
    expect(kanaToHangulWithTokenizer("いいかな", tk)).toBe("이이카나");
    expect(kanaToHangulWithTokenizer("いいかい", tk)).toBe("이이카이");
    expect(kanaToHangulWithTokenizer("いく？", tk)).toBe("이쿠？");
  });

  it("grammar: small っ at start or isolated should not crash (policy check)", () => {
    expect(() => kanaToHangulWithTokenizer("っ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("っあ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("っか", tk)).not.toThrow();
  });

  it("grammar: consecutive long-vowel-like patterns should be stable", () => {
    expect(kanaToHangulWithTokenizer("おおおお", tk)).toBe("오");
    expect(kanaToHangulWithTokenizer("えいえい", tk)).toBe("에에");
    expect(kanaToHangulWithTokenizer("ようよう", tk)).toBe("요요");
    expect(kanaToHangulWithTokenizer("こうこう", tk)).toBe("코코");
  });

  it("grammar: tricky boundaries with ん + youon/sokuon", () => {
    expect(kanaToHangulWithTokenizer("しんゆう", tk)).toBe("신유"); // ゆう drop
    expect(kanaToHangulWithTokenizer("てんきゃく", tk)).toBe("텡캬쿠");
    expect(kanaToHangulWithTokenizer("まんちょく", tk)).toBe("만쵸쿠");
    expect(kanaToHangulWithTokenizer("さんちょっと", tk)).toBe("산춋토");
  });
});

describe("kanaToHangul (extra)", () => {
  // --------------------
  // youon coverage 확대
  // --------------------
  it("youon variety (りゃ/ぎょ/ぴゅ etc.)", () => {
    expect(kanaToHangulWithTokenizer("りゃく", tk)).toBe("랴쿠");
    expect(kanaToHangulWithTokenizer("ぎょざ", tk)).toBe("교자");
    expect(kanaToHangulWithTokenizer("ぴゅあ", tk)).toBe("퓨아");
    expect(kanaToHangulWithTokenizer("びゃく", tk)).toBe("뱌쿠");
    expect(kanaToHangulWithTokenizer("みょん", tk)).toBe("묭"); // 요음 + ん(어말) => ㅇ
    expect(kanaToHangulWithTokenizer("にゃんか", tk)).toBe("냥카"); // 요음 + ん + k => ㅇ (규칙)
  });

  // --------------------
  // sokuon edge 확대
  // --------------------
  it("sokuon with different following consonant classes", () => {
    expect(kanaToHangulWithTokenizer("はっぴょう", tk)).toBe("합표"); // っ + ぴ => ㅂ 종성
    expect(kanaToHangulWithTokenizer("がっき", tk)).toBe("각키"); // っ + k
    expect(kanaToHangulWithTokenizer("けっきょく", tk)).toBe("켓쿄쿠"); // けっ(=ㅅ) + きょ
    expect(kanaToHangulWithTokenizer("きゃっきゃ", tk)).toBe("캭캬"); // っ 처리 + 요음
  });

  // --------------------
  // 장음 드롭 패턴 확대
  // --------------------
  it("long-vowel-like drops (more patterns)", () => {
    expect(kanaToHangulWithTokenizer("どうぞ", tk)).toBe("도조"); // どう -> ど
    expect(kanaToHangulWithTokenizer("こうこう", tk)).toBe("코코"); // 각 こう -> こ
    expect(kanaToHangulWithTokenizer("せいせい", tk)).toBe("세세"); // 각 せい -> せ (예외 아닌 경우)
    expect(kanaToHangulWithTokenizer("えいえん", tk)).toBe("에엔"); // えい -> え, えん -> 엔(기본 ㄴ)
  });

  // --------------------
  // 장음 아닌 것(예외) 확대
  // --------------------
  it("non-long-vowel exceptions should remain (えいこ/けいと/せいな/せいか)", () => {
    expect(kanaToHangulWithTokenizer("えいこ", tk)).toBe("에이코");
    expect(kanaToHangulWithTokenizer("けいと", tk)).toBe("케이토");
    expect(kanaToHangulWithTokenizer("せいな", tk)).toBe("세이나");
    expect(kanaToHangulWithTokenizer("せいか", tk)).toBe("세이카");
    expect(kanaToHangulWithTokenizer("えいく", tk)).toBe("에이쿠"); // particle へ→え + いく 대응 (드롭 금지)
  });

  // --------------------
  // ん 동화 더 때리기
  // --------------------
  it("moraic nasal ん assimilation more cases", () => {
    expect(kanaToHangulWithTokenizer("さんび", tk)).toBe("삼비"); // ん + び => ㅁ
    expect(kanaToHangulWithTokenizer("しんぽ", tk)).toBe("심포"); // ん + ぽ => ㅁ
    expect(kanaToHangulWithTokenizer("てんぷ", tk)).toBe("템푸"); // ん + ぷ => ㅁ
    expect(kanaToHangulWithTokenizer("あんこ", tk)).toBe("앙코"); // ん + こ(k) => (규칙에 따라 ㅇ)
    expect(kanaToHangulWithTokenizer("にゃんこ", tk)).toBe("냥코"); // 요음 + ん + k => ㅇ
    expect(kanaToHangulWithTokenizer("りんぐ", tk)).toBe("링구"); // r + g => ㅇ (규칙)
    expect(kanaToHangulWithTokenizer("しんゆう", tk)).toBe("신유"); // ゆう drop
  });

  // --------------------
  // honorific さん
  // --------------------
  it("honorific さん should become 상 at end", () => {
    expect(kanaToHangulWithTokenizer("たなかさん", tk)).toBe("타나카상");
    expect(kanaToHangulWithTokenizer("すずきさん", tk)).toBe("스즈키상");
  });

  // --------------------
  // particles は / へ / を (heuristic)
  // --------------------
  it("particles heuristics (は/へ/を)", () => {
    expect(kanaToHangulWithTokenizer("ぼくはがくせいです", tk)).toBe(
      "보쿠와가쿠세데스",
    ); // せい drop + は->わ
    expect(kanaToHangulWithTokenizer("ここはさむい", tk)).toBe("코코와사무이"); // は->わ
    expect(kanaToHangulWithTokenizer("うみへいく", tk)).toBe("우미에이쿠"); // へ->え + えいく 유지
    expect(kanaToHangulWithTokenizer("みずをのむ", tk)).toBe("미즈오노무"); // を->오
  });

  // --------------------
  // contractions じゃ / ちゃ + sokuon 안정성
  // --------------------
  it("contractions stability (じゃ/ちゃ) with boundaries", () => {
    expect(kanaToHangulWithTokenizer("それじゃだめ", tk)).toBe("소레쟈다메");
    expect(kanaToHangulWithTokenizer("いっちゃだめ", tk)).toBe("잇챠다메");
    expect(kanaToHangulWithTokenizer("やっちゃった", tk)).toBe("얏챳타");
    expect(kanaToHangulWithTokenizer("じゃなかった", tk)).toBe("쟈나캇타");
  });

  // --------------------
  // mixed scripts, punctuation robustness
  // --------------------
  it("mixed scripts + punctuation robustness", () => {
    expect(kanaToHangulWithTokenizer("「コーヒーをください」", tk)).toBe(
      "「코히오쿠다사이」",
    );
    expect(kanaToHangulWithTokenizer("  (にゃんこ)  ", tk)).toBe("  (냥코)  ");
  });

  // --------------------
  // weird inputs: isolated small chars
  // --------------------
  it("weird inputs should not crash and keep policy", () => {
    expect(() => kanaToHangulWithTokenizer("ゃ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("ゅ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("ょ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("ぁ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("っ", tk)).not.toThrow();
    expect(kanaToHangulWithTokenizer("っ", tk)).toBe("ッ" as any); // 정책: 단독 っ은 "ッ"
  });
});

describe("kanaToHangul - h row (は/ひ/ふ/へ/ほ + ひゃ/ひゅ/ひょ) stress", () => {
  it("basic h-row mapping", () => {
    expect(kanaToHangulWithTokenizer("は", tk)).toBe("하");
    expect(kanaToHangulWithTokenizer("ひ", tk)).toBe("히");
    expect(kanaToHangulWithTokenizer("ふ", tk)).toBe("후");
    expect(kanaToHangulWithTokenizer("へ", tk)).toBe("헤");
    expect(kanaToHangulWithTokenizer("ほ", tk)).toBe("호");

    expect(kanaToHangulWithTokenizer("はひふへほ", tk)).toBe("하히후헤호");
    expect(kanaToHangulWithTokenizer("は ひ ふ へ ほ", tk)).toBe(
      "하 히 후 헤 호",
    );
  });

  it("youon: ひゃ/ひゅ/ひょ -> 햐/휴/효", () => {
    expect(kanaToHangulWithTokenizer("ひゃ", tk)).toBe("햐");
    expect(kanaToHangulWithTokenizer("ひゅ", tk)).toBe("휴");
    expect(kanaToHangulWithTokenizer("ひょ", tk)).toBe("효");

    expect(kanaToHangulWithTokenizer("ひゃく", tk)).toBe("햐쿠");
    expect(kanaToHangulWithTokenizer("ひゅう", tk)).toBe("휴"); // ひゅ + う drop (U_DROP)
    expect(kanaToHangulWithTokenizer("ひょう", tk)).toBe("효"); // ひょ + う drop (o+う drop)
  });

  it("h-row + long-vowel-like drops around it", () => {
    expect(kanaToHangulWithTokenizer("ほう", tk)).toBe("호"); // おう 계열(o+う drop)
    expect(kanaToHangulWithTokenizer("ひょうき", tk)).toBe("효키"); // ひょ + う drop, き keep
    expect(kanaToHangulWithTokenizer("ひゅうが", tk)).toBe("휴가"); // う drop + が
    expect(kanaToHangulWithTokenizer("はよう", tk)).toBe("하요"); // よう -> よ (o+う drop)
  });

  it("sokuon with h-row (っ + は/ひ/ふ/へ/ほ)", () => {
    // っ + h-행은 보통 ㅅ 받침으로 구현될 것(현 로직 default=ㅅ)
    expect(kanaToHangulWithTokenizer("きっは", tk)).toBe("킷하");
    expect(kanaToHangulWithTokenizer("きっひ", tk)).toBe("킷히");
    expect(kanaToHangulWithTokenizer("きっふ", tk)).toBe("킷후");
    expect(kanaToHangulWithTokenizer("きっほ", tk)).toBe("킷호");

    // 요음 앞에서도 안정성
    expect(kanaToHangulWithTokenizer("きっひゃ", tk)).toBe("킷햐");
    expect(kanaToHangulWithTokenizer("きっひょ", tk)).toBe("킷효");
  });

  it("moraic nasal ん + h-row", () => {
    // ん + は/ひ/ふ/へ/ほ : 기본은 ㄴ 유지
    expect(kanaToHangulWithTokenizer("さんは", tk)).toBe("산와"); // (조사 は→わ 휴리스틱이 걸리면 달라질 수 있으니 'さんは'는 사용 금지) -> 그래서 아래처럼 단어 형태로만 테스트
    expect(kanaToHangulWithTokenizer("あんひ", tk)).toBe("안히");
    expect(kanaToHangulWithTokenizer("しんふ", tk)).toBe("신후");
    expect(kanaToHangulWithTokenizer("おきへ", tk)).toBe("오키헤");
    expect(kanaToHangulWithTokenizer("こんほ", tk)).toBe("콘호");

    // 요음 뒤 + ん + h-행: 요음 규칙이 ㅇ으로 강제되면 안 됨(현재는 k/g에만 적용)
    expect(kanaToHangulWithTokenizer("ひゃんひ", tk)).toBe("햔히");
  });

  it("katakana normalization for h-row + youon", () => {
    expect(kanaToHangulWithTokenizer("ホ", tk)).toBe("호");
    expect(kanaToHangulWithTokenizer("ヒ", tk)).toBe("히");
    expect(kanaToHangulWithTokenizer("フ", tk)).toBe("후");
    expect(kanaToHangulWithTokenizer("ヘ", tk)).toBe("헤");
    expect(kanaToHangulWithTokenizer("ハ", tk)).toBe("하");

    expect(kanaToHangulWithTokenizer("ヒャク", tk)).toBe("햐쿠");
    expect(kanaToHangulWithTokenizer("ヒョウ", tk)).toBe("효"); // ひょ + う drop
  });

  it("mixed scripts/punctuation around h-row", () => {
    expect(kanaToHangulWithTokenizer("（ひゃく）", tk)).toBe("（햐쿠）");
    expect(kanaToHangulWithTokenizer("ヒョウ、ヒュウ。", tk)).toBe("효、휴。");
    expect(kanaToHangulWithTokenizer("AひB", tk)).toBe("A히B");
  });

  it("direction particle へ -> え should not break nearby h-row mappings", () => {
    // へ as direction marker: え
    expect(kanaToHangulWithTokenizer("ほてるへいく", tk)).toBe("호테루에이쿠"); // へ->え, えいく drop 금지
    // 일반 へ는 헤
    expect(kanaToHangulWithTokenizer("へや", tk)).toBe("헤야");
  });

  it("topic particle は -> わ should not break 'は/ひ/ふ/へ/ほ' core mapping elsewhere", () => {
    // 단독/일반 は는 하
    expect(kanaToHangulWithTokenizer("はは", tk)).toBe("하하");
  });
});

describe("particle: へ as 'e' (direction) - verb coverage", () => {
  it("へ + movement verbs (common)", () => {
    // 行く
    expect(kanaToHangulWithTokenizer("がっこうへいく", tk)).toBe("각코에이쿠"); // こう -> こ + へ->え + えいく 유지
    // 来る
    expect(kanaToHangulWithTokenizer("うちへくる", tk)).toBe("우치에쿠루");
    // 帰る
    expect(kanaToHangulWithTokenizer("いえへかえる", tk)).toBe("이에에카에루");
    // 向かう
    expect(kanaToHangulWithTokenizer("がっこうへむかう", tk)).toBe(
      "각코에무카우",
    );
    // 進む
    expect(kanaToHangulWithTokenizer("まえへすすむ", tk)).toBe("마에에스스무");
    // 出かける
    expect(kanaToHangulWithTokenizer("まちへでかける", tk)).toBe(
      "마치에데카케루",
    );
    // 出る
    expect(kanaToHangulWithTokenizer("そとへでる", tk)).toBe("소토에데루");
    // 入る
    expect(kanaToHangulWithTokenizer("へやへはいる", tk)).toBe("헤야에하이루"); // 첫 へ야는 단어(헤야), 두 번째 へ는 조사(에)
    // 移る
    expect(kanaToHangulWithTokenizer("あちらへうつる", tk)).toBe(
      "아치라에우츠루",
    );
    // 渡る
    expect(kanaToHangulWithTokenizer("むこうへわたる", tk)).toBe(
      "무코에와타루",
    ); // こう drop
    // 上る
    expect(kanaToHangulWithTokenizer("うえへのぼる", tk)).toBe("우에에노보루");
    // 歩く / 走る
    expect(kanaToHangulWithTokenizer("あっちへあるく", tk)).toBe(
      "앗치에아루쿠",
    );
    expect(kanaToHangulWithTokenizer("あっちへはしる", tk)).toBe(
      "앗치에하시루",
    );
  });

  it("へ without a verb: treat as direction at end/punctuation", () => {
    expect(kanaToHangulWithTokenizer("東京(とうきょう)へ！", tk)).toBe(
      "東京(도쿄)에！",
    );
    expect(kanaToHangulWithTokenizer("東京(とうきょう)へ", tk)).toBe(
      "東京(도쿄)에",
    );
    expect(kanaToHangulWithTokenizer("（とうきょう）へ。", tk)).toBe(
      "（도쿄）에。",
    );
  });

  it("sokuon with h-row (っ + は/ひ/ふ/ほ) - stable", () => {
    expect(kanaToHangulWithTokenizer("きっは", tk)).toBe("킷하");
    expect(kanaToHangulWithTokenizer("きっひ", tk)).toBe("킷히");
    expect(kanaToHangulWithTokenizer("きっふ", tk)).toBe("킷후");
    expect(kanaToHangulWithTokenizer("きっほ", tk)).toBe("킷호");
  });

  it("へ as word vs particle - separation", () => {
    expect(kanaToHangulWithTokenizer("へや", tk)).toBe("헤야"); // word
    expect(kanaToHangulWithTokenizer("がっこうへいく", tk)).toBe("각코에이쿠"); // particle
    expect(kanaToHangulWithTokenizer("東京(とうきょう)へ！", tk)).toBe(
      "東京(도쿄)에！",
    ); // particle w/ punctuation
  });
});
describe("kanaToHangul - lexical words ending with へ (must end with 헤)", () => {
  it("archaic/lexical 〜へ words (real)", () => {
    // いにしへ(고어 표기) = 옛날/먼 옛날
    expect(kanaToHangulWithTokenizer("いにしへ", tk)).toBe("이니시헤"); // ※ 현대 표기는 보통 いにしえ :contentReference[oaicite:1]{index=1}

    // 沖辺(おきへ) : 바다 쪽/먼바다 쪽 (문어) :contentReference[oaicite:2]{index=2}
    expect(kanaToHangulWithTokenizer("おきへ", tk)).toBe("오키헤");

    // 本辺(もとへ) : 밑/근처/기슭 쪽 (문어) :contentReference[oaicite:3]{index=3}
    expect(kanaToHangulWithTokenizer("もとへ", tk)).toBe("모토헤");

    // 末辺(すゑへ/すえへ) : 끝/꼭대기 쪽 (문어) :contentReference[oaicite:4]{index=4}
    expect(kanaToHangulWithTokenizer("すえへ", tk)).toBe("스에헤");

    // 上辺(かみへ) : 상류/위쪽 (고어) :contentReference[oaicite:5]{index=5}
    expect(kanaToHangulWithTokenizer("かみへ", tk)).toBe("카미헤");

    // 国辺(고어로 くにへ) : 나라 쪽/고향 쪽 (고어 표기) :contentReference[oaicite:6]{index=6}
    expect(kanaToHangulWithTokenizer("くにへ", tk)).toBe("쿠니헤");

    // 岸辺의 고어 표기 예문에 'きしへ'가 등장 (고어 표기 테스트용) :contentReference[oaicite:7]{index=7}
    expect(kanaToHangulWithTokenizer("きしへ", tk)).toBe("키시헤");
  });

  it("must NOT be rewritten as particle へ→え inside these lexical words", () => {
    // 끝이 へ인 단어는 '...에'가 되면 안 됨
    expect(kanaToHangulWithTokenizer("おきへ", tk)).not.toBe("오키에");
    expect(kanaToHangulWithTokenizer("もとへ", tk)).not.toBe("모토에");
    expect(kanaToHangulWithTokenizer("すえへ", tk)).not.toBe("스에에");
    expect(kanaToHangulWithTokenizer("かみへ", tk)).not.toBe("카미에");
    expect(kanaToHangulWithTokenizer("くにへ", tk)).not.toBe("쿠니에");
  });
});
describe("kanaToHangul - unicode normalization edge cases", () => {
  it("NFD dakuten should behave like NFC", () => {
    // がっこう = がっこう (NFD)
    expect(kanaToHangulWithTokenizer("か\u3099っこう", tk)).toBe("각코");
    // ぱ = ぱ (NFD handakuten)
    expect(kanaToHangulWithTokenizer("は\u309aん", tk)).toBe("판");
  });

  it("halfwidth katakana should normalize", () => {
    expect(kanaToHangulWithTokenizer("ﾊﾝｶｸｶﾀｶﾅ", tk)).toBe("항카쿠카타카나");
  });
});

describe("kanaToHangul - prolonged sound mark variants", () => {
  it("various dash-like marks should be treated like ー (drop)", () => {
    expect(kanaToHangulWithTokenizer("みゅｰじっく", tk)).toBe("뮤지쿠"); // 'ｰ' U+FF70
    expect(kanaToHangulWithTokenizer("コ―ヒ―", tk)).toBe("코히"); // '―' U+2015
  });
});
describe("kanaToHangul - stray small kana", () => {
  it("stray small kana should not crash and should be pass-through or policy-based", () => {
    expect(() => kanaToHangulWithTokenizer("ゃゅょ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("ぁぃぅぇぉ", tk)).not.toThrow();
    expect(kanaToHangulWithTokenizer("ゃ", tk)).toBe("ゃ" as any); // 정책: 그대로 통과(권장)
  });

  it("small kana after non-i-row should not form youon incorrectly", () => {
    // 예: かゃ 같은 건 보통 입력 오류 -> 그대로 처리하거나 최소한 크래시 금지
    expect(() => kanaToHangulWithTokenizer("かゃ", tk)).not.toThrow();
  });
});
describe("kanaToHangul - sokuon weird positions", () => {
  it("sokuon at start or after punctuation should not crash", () => {
    expect(() => kanaToHangulWithTokenizer("っ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("！っか", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("「っ」", tk)).not.toThrow();
  });

  it("multiple sokuon should be stable", () => {
    expect(() => kanaToHangulWithTokenizer("っっっか", tk)).not.toThrow();
  });
});
describe("kanaToHangul - nasal boundary weirdness", () => {
  it("ん before sokuon should be stable", () => {
    expect(() => kanaToHangulWithTokenizer("なんっか", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("こんっちは", tk)).not.toThrow(); // こんにちは 변형 입력
  });

  it("double ん should not produce broken jamo", () => {
    expect(() => kanaToHangulWithTokenizer("んん", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("こんんな", tk)).not.toThrow();
  });
});
describe("kanaToHangul - particle false positives", () => {
  it("へ in 'へや' must stay '헤' (not particle)", () => {
    expect(kanaToHangulWithTokenizer("へや", tk)).toBe("헤야");
    expect(kanaToHangulWithTokenizer("へやへいく", tk)).toBe("헤야에이쿠"); // 첫 へ: 단어, 둘째 へ: 조사
  });

  it("〜のへ pattern should stay '노헤' (placename-like)", () => {
    expect(kanaToHangulWithTokenizer("はちのへ", tk)).toBe("하치노헤");
    expect(kanaToHangulWithTokenizer("さんのへ", tk)).toBe("산노헤");
  });

  it("lexical …へ must not be rewritten even before punctuation", () => {
    expect(kanaToHangulWithTokenizer("いにしへ！", tk)).toBe("이니시헤！");
    expect(kanaToHangulWithTokenizer("おきへ。", tk)).toBe("오키헤。");
  });
});
describe("kanaToHangul - loanword hard cases", () => {
  it("combo + sokuon + long mark", () => {
    expect(kanaToHangulWithTokenizer("ファッション", tk)).toBe("팟숑"); // っ + しょ + ん(어말) 규칙에 따라 달라질 수 있음
    expect(kanaToHangulWithTokenizer("ティッシュー", tk)).toBe("팃슈"); // ー drop
    expect(kanaToHangulWithTokenizer("フォー", tk)).toBe("포"); // ー drop
  });
});
describe("kanaToHangul - more edge cases", () => {
  // --------------------
  // Unicode normalization (NFD/NFC) + punctuation preservation
  // --------------------
  it("NFD dakuten/handakuten should work (NFC normalize inside)", () => {
    // がっこう (NFD)
    expect(kanaToHangulWithTokenizer("か\u3099っこう", tk)).toBe("각코");
    // ぱん (NFD)
    expect(kanaToHangulWithTokenizer("は\u309aん", tk)).toBe("판");
  });

  it("should preserve non-Japanese punctuation/emoji as-is", () => {
    expect(kanaToHangulWithTokenizer("いにしへ！", tk)).toBe("이니시헤！"); // 전각 ! 유지
    expect(kanaToHangulWithTokenizer("（おはよう）", tk)).toBe("（오하요）"); // 전각 괄호 유지
    expect(kanaToHangulWithTokenizer("すごい👍", tk)).toBe("스고이👍"); // 이모지 보존
    expect(kanaToHangulWithTokenizer("「へや」", tk)).toBe("「헤야」"); // 단어 へや는 '헤'
  });

  // --------------------
  // Halfwidth katakana: normalize only those chunks
  // --------------------
  it("halfwidth katakana should normalize (and apply nasal assimilation)", () => {
    // ﾊﾝｶｸｶﾀｶﾅ => ハンカクカタカナ
    // ン + カ(k) => ㅇ 느낌 => 항카쿠...
    expect(kanaToHangulWithTokenizer("ﾊﾝｶｸｶﾀｶﾅ", tk)).toBe("항카쿠카타카나");
  });

  it("halfwidth with handakuten should normalize too (ﾊﾟ etc.)", () => {
    // ﾊﾟﾝｹｰｷ => パンケーキ
    // ン + ケ(k) => ㅇ => 팡..., ー drop
    expect(kanaToHangulWithTokenizer("ﾊﾟﾝｹｰｷ", tk)).toBe("팡케키");
    expect(kanaToHangulWithTokenizer("パンケーキ", tk)).toBe("팡케키");
  });

  // --------------------
  // Prolonged sound mark variants
  // --------------------
  it("prolonged-sound variants should behave like ー (drop)", () => {
    // FF70 'ｰ' should be treated like ー (drop)
    expect(kanaToHangulWithTokenizer("みゅｰじっく", tk)).toBe("뮤지쿠");
    // U+2015 '―' treated like ー (drop)
    expect(kanaToHangulWithTokenizer("コ―ヒ―", tk)).toBe("코히");
  });

  // --------------------
  // Particle false positives (へ)
  // --------------------
  it("へ in a lexical word should stay '헤' even with punctuation", () => {
    expect(kanaToHangulWithTokenizer("いにしへ。", tk)).toBe("이니시헤。");
    expect(kanaToHangulWithTokenizer("もとへ、", tk)).toBe("모토헤、");
  });

  it("へや must not be rewritten to えや", () => {
    expect(kanaToHangulWithTokenizer("へや", tk)).toBe("헤야");
    // first へ(へや)=헤, second へ(particle)=에
    expect(kanaToHangulWithTokenizer("へやへいく", tk)).toBe("헤야에이쿠");
  });

  it("〜のへ should be protected as placename-like (optional policy)", () => {
    expect(kanaToHangulWithTokenizer("はちのへ", tk)).toBe("하치노헤");
    expect(kanaToHangulWithTokenizer("さんのへ", tk)).toBe("산노헤");
  });

  // --------------------
  // ん assimilation torture (k/g, p/b/m, vowel boundary)
  // --------------------
  it("ん before k/g should lean to ㅇ (NG)", () => {
    expect(kanaToHangulWithTokenizer("しんがぽーる", tk)).toBe("싱가포루"); // ん+が => ㅇ, ー drop
    expect(kanaToHangulWithTokenizer("りんぐ", tk)).toBe("링구"); // ん+ぐ
    expect(kanaToHangulWithTokenizer("あんこ", tk)).toBe("앙코"); // ん+こ
  });

  it("ん before p/b/m should become ㅁ (M) except vowelOnly policy", () => {
    expect(kanaToHangulWithTokenizer("しんぱい", tk)).toBe("심파이"); // ん+ぱ => ㅁ
    expect(kanaToHangulWithTokenizer("さんぷる", tk)).toBe("삼푸루"); // ん+ぷ => ㅁ
    expect(kanaToHangulWithTokenizer("しんぶん", tk)).toBe("심분"); // ん+ぶ => ㅁ
  });

  it("ん before vowel/y/w should stay ㄴ (N)", () => {
    expect(kanaToHangulWithTokenizer("てんいん", tk)).toBe("텐인");
    expect(kanaToHangulWithTokenizer("かんおん", tk)).toBe("칸온");
    expect(kanaToHangulWithTokenizer("まんいち", tk)).toBe("만이치");
  });

  // --------------------
  // Small kana / weird sequences robustness
  // --------------------
  it("stray small kana should not crash and should be pass-through (policy)", () => {
    expect(() => kanaToHangulWithTokenizer("ゃ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("ゅ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("ょ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("ぁぃぅぇぉ", tk)).not.toThrow();

    // 정책: 단독 small kana는 그대로 통과(원하면 바꿔도 됨)
    expect(kanaToHangulWithTokenizer("ゃ", tk)).toBe("ゃ" as any);
  });

  it("iteration marks should not crash (usually pass-through)", () => {
    expect(() => kanaToHangulWithTokenizer("ゝゞヽヾ", tk)).not.toThrow();
    expect(kanaToHangulWithTokenizer("ゝゞ", tk)).toBe("ゝゞ" as any);
  });

  // --------------------
  // Stress: long input should not hang (no infinite loops)
  // --------------------
  it("long repeated input should finish", () => {
    const s = "がっこうへいく。".repeat(200); // 적당히 길게
    expect(() => kanaToHangulWithTokenizer(s, tk)).not.toThrow();
  });

  it("output should not contain combining dakuten/handakuten", () => {
    const out = kanaToHangulWithTokenizer("か\u3099っこう は\u309aん", tk);
    expect(out).not.toMatch(/[\u3099\u309A]/);
  });
});

describe("kanaToHangul - grammar extreme edge cases", () => {
  // --------------------
  // 1) Particles with boundaries: quotes / parentheses / punctuation
  // --------------------
  it("particle は (wa) with boundaries", () => {
    expect(kanaToHangulWithTokenizer("（きょうはあつい）", tk)).toBe(
      "（쿄와아츠이）",
    );
    expect(kanaToHangulWithTokenizer("それは。", tk)).toBe("소레와。");
  });

  it("particle へ (e) when phrase ends with punctuation", () => {
    expect(kanaToHangulWithTokenizer("がっこうへ。", tk)).toBe("각코에。");
    expect(kanaToHangulWithTokenizer("東京へ！", tk)).toBe("東京에！"); // 한자 보존 + へ만 변환
    expect(kanaToHangulWithTokenizer("（がっこうへ）いく", tk)).toBe(
      "（각코에）이쿠",
    );
  });

  it("particle を (o) with punctuation and spacing", () => {
    expect(kanaToHangulWithTokenizer("すしを、たべる", tk)).toBe(
      "스시오、타베루",
    );
    expect(kanaToHangulWithTokenizer("みずを  のむ", tk)).toBe("미즈오  노무");
    expect(kanaToHangulWithTokenizer("「パンを」たべる", tk)).toBe(
      "「판오」타베루",
    );
  });

  // --------------------
  // 2) ている / ておく / ていく : don't mis-drop てい
  // --------------------
  it("ている family should keep てい (not treated as long-vowel drop)", () => {
    expect(kanaToHangulWithTokenizer("たべている", tk)).toBe("타베테이루");
    expect(kanaToHangulWithTokenizer("よんでいる", tk)).toBe("욘데이루");
    expect(kanaToHangulWithTokenizer("している", tk)).toBe("시테이루");
  });

  it("ていく / ておく boundaries", () => {
    expect(kanaToHangulWithTokenizer("もっていく", tk)).toBe("못테이쿠"); // って + いく (い drop 금지!)
    expect(kanaToHangulWithTokenizer("かっておく", tk)).toBe("캇테오쿠");
    expect(kanaToHangulWithTokenizer("やっておく", tk)).toBe("얏테오쿠");
  });

  // --------------------
  // 3) polite auxiliary: でしょう / ましょう : drop the trailing う only in those patterns
  // --------------------
  it("でしょう / ましょう should drop trailing う", () => {
    expect(kanaToHangulWithTokenizer("そうでしょう", tk)).toBe("소데쇼");
    expect(kanaToHangulWithTokenizer("いいでしょうか", tk)).toBe("이데쇼카");
    expect(kanaToHangulWithTokenizer("いきましょう", tk)).toBe("이키마쇼");
    expect(kanaToHangulWithTokenizer("やりましょうか", tk)).toBe("야리마쇼카");
  });

  // --------------------
  // 4) Contractions / colloquial
  // --------------------
  it("てしまう / ちゃう / ちゃった (keep stable with sokuon)", () => {
    expect(kanaToHangulWithTokenizer("たべてしまう", tk)).toBe("타베테시마우"); // う drop 정책이면 타베테시마
    expect(kanaToHangulWithTokenizer("たべちゃう", tk)).toBe("타베챠우");
    expect(kanaToHangulWithTokenizer("みちゃった", tk)).toBe("미챳타");
    expect(kanaToHangulWithTokenizer("やっちゃった", tk)).toBe("얏챳타");
  });

  it("じゃ / じゃない / じゃん (dewa contraction family)", () => {
    expect(kanaToHangulWithTokenizer("それじゃ", tk)).toBe("소레쟈");
    expect(kanaToHangulWithTokenizer("じゃない", tk)).toBe("쟈나이");
    expect(kanaToHangulWithTokenizer("じゃなかった", tk)).toBe("쟈나캇타");
    expect(kanaToHangulWithTokenizer("じゃん", tk)).toBe("쟝"); // ん 어말 정책(ㄴ/ㅇ)은 구현에 맞춰 조정 가능
  });

  it("っす / っけ / っぽい / ってさ (very colloquial)", () => {
    // 여기선 '정확 발음'이 아니라 '크래시/경계 안정'이 목표
    expect(() => kanaToHangulWithTokenizer("おつかれっす", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("どこだっけ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("それっぽい", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("ってさ", tk)).not.toThrow();
  });

  // --------------------
  // 5) Negative forms with sokuon and boundaries
  // --------------------
  it("negatives: ない / なかった / なくて with sokuon stability", () => {
    expect(kanaToHangulWithTokenizer("いかない", tk)).toBe("이카나이");
    expect(kanaToHangulWithTokenizer("いかなかった", tk)).toBe("이카나캇타");
    expect(kanaToHangulWithTokenizer("いかなくて", tk)).toBe("이카나쿠테");
    expect(kanaToHangulWithTokenizer("やらなかった", tk)).toBe("야라나캇타");
  });

  // --------------------
  // 6) Conditionals / connectors: たら / なら / ても / たり / ながら
  // --------------------
  it("conditionals/connectors should keep boundaries stable", () => {
    expect(kanaToHangulWithTokenizer("いったら", tk)).toBe("잇타라");
    expect(kanaToHangulWithTokenizer("いくなら", tk)).toBe("이쿠나라");
    expect(kanaToHangulWithTokenizer("いっても", tk)).toBe("잇테모");
    expect(kanaToHangulWithTokenizer("たべたりのんだり", tk)).toBe(
      "타베타리논다리",
    );
    expect(kanaToHangulWithTokenizer("あるきながら", tk)).toBe("아루키나가라");
  });

  // --------------------
  // 7) Sentence-final particles: ね/よ/かな/かい/さ/な
  // --------------------
  it("ending particles remain intact", () => {
    expect(kanaToHangulWithTokenizer("いいね", tk)).toBe("이이네");
    expect(kanaToHangulWithTokenizer("いいよ", tk)).toBe("이이요");
    expect(kanaToHangulWithTokenizer("いいかな", tk)).toBe("이이카나");
    expect(kanaToHangulWithTokenizer("いいかい", tk)).toBe("이이카이");
    expect(kanaToHangulWithTokenizer("そうさ", tk)).toBe("소사");
    expect(kanaToHangulWithTokenizer("だめだな", tk)).toBe("다메다나");
  });

  // --------------------
  // 8) Tricky mora boundaries: ん + youon / ん + sokuon / ん + ちょっ
  // --------------------
  it("tricky boundaries with ん + youon/sokuon", () => {
    expect(kanaToHangulWithTokenizer("てんきゃく", tk)).toBe("텡캬쿠");
    expect(kanaToHangulWithTokenizer("さんちょく", tk)).toBe("산쵸쿠");
    expect(kanaToHangulWithTokenizer("まんちょっと", tk)).toBe("만춋토");
    expect(() => kanaToHangulWithTokenizer("なんっか", tk)).not.toThrow();
  });

  // --------------------
  // 9) Mixed scripts: kanji + kana + particles + quotes
  // --------------------
  it("mixed scripts with particles should behave", () => {
    expect(kanaToHangulWithTokenizer("第3回(だいさんかい)へいく", tk)).toBe(
      "第3回(다이상카이)에이쿠",
    );
    expect(kanaToHangulWithTokenizer("誕生日(たんじょうび)を祝う", tk)).toBe(
      "誕生日(탄죠비)오祝우",
    ); // 한자 보존
  });

  // --------------------
  // 10) "っ" isolated policy: never crash
  // --------------------
  it("isolated small っ should not crash", () => {
    expect(() => kanaToHangulWithTokenizer("っ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("っあ", tk)).not.toThrow();
    expect(() => kanaToHangulWithTokenizer("「っ」", tk)).not.toThrow();
  });
});
describe("kanaToHangul - particles stress (は/へ/を)", () => {
  // =========================================================
  // は -> わ (topic marker)
  // =========================================================
  describe("particle は -> わ (topic marker) : boundary torture", () => {
    it("basic: should convert only when it's a particle", () => {
      expect(kanaToHangulWithTokenizer("ぼくはがくせいです", tk)).toBe(
        "보쿠와가쿠세데스",
      );
      expect(kanaToHangulWithTokenizer("あなたはせんせいです", tk)).toBe(
        "아나타와센세데스",
      ); // せい drop
      expect(kanaToHangulWithTokenizer("これはほんです", tk)).toBe(
        "코레와혼데스",
      );
      expect(kanaToHangulWithTokenizer("きょうはあめです", tk)).toBe(
        "쿄와아메데스",
      ); // きょう -> きょ
      expect(kanaToHangulWithTokenizer("あしたはやすみです", tk)).toBe(
        "아시타와야스미데스",
      );
    });

    it("punctuation/quotes/parentheses around は", () => {
      expect(kanaToHangulWithTokenizer("それは、ほんと？", tk)).toBe(
        "소레와、혼토？",
      );
      expect(kanaToHangulWithTokenizer("それは。", tk)).toBe("소레와。");
      expect(kanaToHangulWithTokenizer("「それはほん」", tk)).toBe(
        "「소레와혼」",
      );
      expect(kanaToHangulWithTokenizer("（それはほん）", tk)).toBe(
        "（소레와혼）",
      );
      expect(kanaToHangulWithTokenizer("それは!", tk)).toBe("소레와!");
    });

    it("mixed scripts: kanji/number/emoji boundaries", () => {
      expect(kanaToHangulWithTokenizer("第3回はきょうです", tk)).toBe(
        "第3回와쿄데스",
      );
      expect(kanaToHangulWithTokenizer("東京(とうきょう)はさむい", tk)).toBe(
        "東京(도쿄)와사무이",
      );
      expect(kanaToHangulWithTokenizer("AはBです", tk)).toBe("A와B데스");
    });

    it("multiple は in one sentence", () => {
      expect(kanaToHangulWithTokenizer("これはそれはあれはほんです", tk)).toBe(
        "코레와소레와아레와혼데스",
      );
      expect(kanaToHangulWithTokenizer("ぼくはがっこうへいく", tk)).toBe(
        "보쿠와각코에이쿠",
      );
    });

    it("false positives: は inside lexical words must stay ハ-row mapping", () => {
      // 단어 내부 'は'는 '하'로 남아야 함
      expect(kanaToHangulWithTokenizer("はな", tk)).toBe("하나");
      expect(kanaToHangulWithTokenizer("はなはきれい", tk)).toBe(
        "하나와키레이",
      ); // 앞 'はな' 유지, 뒤 particle만 わ

      expect(kanaToHangulWithTokenizer("はし", tk)).toBe("하시");
      expect(kanaToHangulWithTokenizer("はしはながい", tk)).toBe(
        "하시와나가이",
      );

      // "はは" (엄마) 같은 반복도 조사로 오인하면 안 됨
      expect(kanaToHangulWithTokenizer("はは", tk)).toBe("하하");
      // expect(kanaToHangulWithTokenizer("はははげんき", tk)).toBe("하하와겡키"); // 근데 이건 하하하 건강해요 라고 해석 가능함.

      // "こんにちは/こんばんは" 같은 고정 표현
      expect(kanaToHangulWithTokenizer("こんばんは", tk)).toBe("콤방와"); // ん + ば => ㅁ, は->わ
      expect(kanaToHangulWithTokenizer("こんにちは", tk)).toBe("콘니치와");
    });

    it("particle は next to small/long-vowel patterns", () => {
      expect(kanaToHangulWithTokenizer("きょうはいい", tk)).toBe("쿄와이이");
      expect(kanaToHangulWithTokenizer("おねえさんはやさしい", tk)).toBe(
        "오네상와야사시이",
      ); // ねえ drop + は->わ
    });
  });

  // =========================================================
  // へ -> え (direction marker)
  // =========================================================
  describe("particle へ -> え (direction marker) : boundary torture", () => {
    it("basic movement verbs", () => {
      expect(kanaToHangulWithTokenizer("がっこうへいく", tk)).toBe(
        "각코에이쿠",
      );
      expect(kanaToHangulWithTokenizer("うちへかえる", tk)).toBe(
        "우치에카에루",
      );
      expect(kanaToHangulWithTokenizer("まちへでかける", tk)).toBe(
        "마치에데카케루",
      );
      expect(kanaToHangulWithTokenizer("そとへでる", tk)).toBe("소토에데루");
      expect(kanaToHangulWithTokenizer("あっちへあるく", tk)).toBe(
        "앗치에아루쿠",
      );
    });

    it("punctuation / end-of-phrase へ", () => {
      expect(kanaToHangulWithTokenizer("がっこうへ。", tk)).toBe("각코에。");
      expect(kanaToHangulWithTokenizer("がっこうへ！", tk)).toBe("각코에！");
      expect(kanaToHangulWithTokenizer("（がっこうへ）いく", tk)).toBe(
        "（각코에）이쿠",
      );
      expect(kanaToHangulWithTokenizer("「がっこうへ」", tk)).toBe(
        "「각코에」",
      );
    });

    it("mixed scripts around へ", () => {
      expect(kanaToHangulWithTokenizer("東京(とうきょう)へいく", tk)).toBe(
        "東京(도쿄)에이쿠",
      );
      expect(kanaToHangulWithTokenizer("第3回へいく", tk)).toBe("第3回에이쿠");
      expect(kanaToHangulWithTokenizer("Aへいく", tk)).toBe("A에이쿠");
      expect(kanaToHangulWithTokenizer("😀へいく", tk)).toBe("😀에이쿠");
    });

    it("double へ : word vs particle separation", () => {
      // へや(방) = lexical word => '헤야'
      // へ(조사) = '에'
      expect(kanaToHangulWithTokenizer("へやへいく", tk)).toBe("헤야에이쿠");
      expect(kanaToHangulWithTokenizer("へやへかえる", tk)).toBe(
        "헤야에카에루",
      );
    });

    it("false positives: へ inside lexical words / placenames must stay '헤'", () => {
      expect(kanaToHangulWithTokenizer("へや", tk)).toBe("헤야");
      expect(kanaToHangulWithTokenizer("はちのへ", tk)).toBe("하치노헤");
      expect(kanaToHangulWithTokenizer("さんのへ", tk)).toBe("산노헤");

      // 뒤에 구두점이 붙어도 '단어로 끝나는 へ'면 바뀌면 안 되는 케이스(정책 테스트)
      // (이건 구현 정책에 따라 on/off 하셔도 됩니다)
      expect(kanaToHangulWithTokenizer("はちのへ。", tk)).toBe("하치노헤。");
      expect(kanaToHangulWithTokenizer("へや。", tk)).toBe("헤야。");
    });

    it("へ + いく 계열에서 えい(=え+い)를 장음으로 오인하지 말기", () => {
      // 핵심: へ->え 한 뒤에 "いく"의 い를 드롭하면 망함
      expect(kanaToHangulWithTokenizer("がっこうへいく", tk)).toBe(
        "각코에이쿠",
      );
      expect(kanaToHangulWithTokenizer("としょかんへいく", tk)).toBe(
        "토쇼칸에이쿠",
      );
      expect(kanaToHangulWithTokenizer("ほてるへいく", tk)).toBe(
        "호테루에이쿠",
      );
    });
  });

  // =========================================================
  // を -> お (object marker)
  // =========================================================
  describe("particle を -> お (object marker) : boundary torture", () => {
    it("basic objects", () => {
      expect(kanaToHangulWithTokenizer("ほんをよむ", tk)).toBe("혼오요무");
      expect(kanaToHangulWithTokenizer("みずをのむ", tk)).toBe("미즈오노무");
      expect(kanaToHangulWithTokenizer("すしをたべる", tk)).toBe(
        "스시오타베루",
      );
      expect(kanaToHangulWithTokenizer("パンをたべる", tk)).toBe("판오타베루");
    });

    it("punctuation/spaces around を", () => {
      expect(kanaToHangulWithTokenizer("すしを、たべる", tk)).toBe(
        "스시오、타베루",
      );
      expect(kanaToHangulWithTokenizer("みずを  のむ", tk)).toBe(
        "미즈오  노무",
      );
      expect(kanaToHangulWithTokenizer("「パンを」たべる", tk)).toBe(
        "「판오」타베루",
      );
      expect(kanaToHangulWithTokenizer("（ほんを）よむ", tk)).toBe(
        "（혼오）요무",
      );
    });

    it("mixed scripts around を", () => {
      expect(
        kanaToHangulWithTokenizer("誕生日(たんじょうび)をいわう", tk),
      ).toBe("誕生日(탄죠비)오이와우");
      expect(kanaToHangulWithTokenizer("第3回をみる", tk)).toBe("第3回오미루");
      expect(kanaToHangulWithTokenizer("AをBにする", tk)).toBe("A오B니스루");
      expect(kanaToHangulWithTokenizer("😀をみる", tk)).toBe("😀오미루");
    });

    it("multiple objects and chained particles", () => {
      expect(kanaToHangulWithTokenizer("パンをコーヒーをください", tk)).toBe(
        "판오코히오쿠다사이",
      );
      expect(kanaToHangulWithTokenizer("すしをみずをのむ", tk)).toBe(
        "스시오미즈오노무",
      );
      expect(kanaToHangulWithTokenizer("ほんをよんでいる", tk)).toBe(
        "혼오욘데이루",
      ); // てい 보호
    });

    it("を right before vowel-starting word", () => {
      expect(kanaToHangulWithTokenizer("おちゃをのむ", tk)).toBe("오챠오노무");
      expect(kanaToHangulWithTokenizer("えをえらぶ", tk)).toBe("에오에라부"); // を가 끼면 えい 룰과 헷갈리기 쉬움
    });
  });

  // =========================================================
  // Combined: は/へ/を all together in one sentence
  // =========================================================
  describe("particles combined (は/へ/を) : nested & repeated", () => {
    it("simple combined sentences", () => {
      expect(kanaToHangulWithTokenizer("ぼくはがっこうへいく", tk)).toBe(
        "보쿠와각코에이쿠",
      );
      expect(kanaToHangulWithTokenizer("これはほんをよむ", tk)).toBe(
        "코레와혼오요무",
      );
      expect(kanaToHangulWithTokenizer("あなたはうちへかえる", tk)).toBe(
        "아나타와우치에카에루",
      );
    });

    it("hard combined with punctuation/quotes", () => {
      expect(kanaToHangulWithTokenizer("「ぼくはパンをたべる」", tk)).toBe(
        "「보쿠와판오타베루」",
      );
      expect(kanaToHangulWithTokenizer("（これはほんをよむ）よ", tk)).toBe(
        "（코레와혼오요무）요",
      );
      expect(kanaToHangulWithTokenizer("それは、がっこうへいく？", tk)).toBe(
        "소레와、각코에이쿠？",
      );
    });

    it("double topics + object + direction", () => {
      expect(
        kanaToHangulWithTokenizer("ぼくはほんをがっこうへもっていく", tk),
      ).toBe("보쿠와혼오각코에못테이쿠");
    });
  });
});
describe("grammar pronunciation edge cases (enable when rules are implemented)", () => {
  it("particle: は as 'wa' when used as topic marker", () => {
    expect(kanaToHangulWithTokenizer("あなたはせいふくです", tk)).toBe(
      "아나타와세후쿠데스",
    ); // せい drop
    expect(kanaToHangulWithTokenizer("それはノートです", tk)).toBe(
      "소레와노토데스",
    ); // ー drop
    expect(kanaToHangulWithTokenizer("あしたはさむい", tk)).toBe(
      "아시타와사무이",
    );
    expect(kanaToHangulWithTokenizer("こんにちは", tk)).toBe("콘니치와"); // 実発音
  });
});

describe("numbers & '-san' edge cases", () => {
  it("numbers: keep ASCII digits as-is", () => {
    expect(kanaToHangulWithTokenizer("12345", tk)).toBe("12345");
    expect(kanaToHangulWithTokenizer("3", tk)).toBe("3"); // 특히 3
    expect(kanaToHangulWithTokenizer("0", tk)).toBe("0");
  });

  it("honorific: さん -> 상 (should not conflict with digit '3')", () => {
    expect(kanaToHangulWithTokenizer("おじさん", tk)).toBe("오지상");
    expect(kanaToHangulWithTokenizer("おかあさん", tk)).toBe("오카아상");
    expect(kanaToHangulWithTokenizer("かおるさん", tk)).toBe("카오루상"); // '카루상' 계열 테스트(카오루)
    expect(kanaToHangulWithTokenizer("3さん", tk)).toBe("3상");
    expect(kanaToHangulWithTokenizer("さん3", tk)).toBe("산3");
  });

  it("mix: -san + particle は", () => {
    expect(kanaToHangulWithTokenizer("おじさんはやさしい", tk)).toBe(
      "오지상와야사시이",
    );
    expect(kanaToHangulWithTokenizer("おかあさんはげんき", tk)).toBe(
      "오카아상와겡키",
    );
  });
});

describe("word-final は vs particle は", () => {
  it("word-final は inside a word should stay 'ha' (not 'wa')", () => {
    expect(kanaToHangulWithTokenizer("いろは", tk)).toBe("이로하");
    expect(kanaToHangulWithTokenizer("いろはです", tk)).toBe("이로하데스");
  });

  it("particle は at the end / before predicate should be 'wa'", () => {
    expect(kanaToHangulWithTokenizer("わたしは", tk)).toBe("와타시와");
    expect(kanaToHangulWithTokenizer("わたしはがくせい", tk)).toBe(
      "와타시와가쿠세",
    );
  });
});

describe("ハロ / ハロー ending words", () => {
  it("katakana 'ハロ' family + long vowel mark drop", () => {
    expect(kanaToHangulWithTokenizer("ハロ", tk)).toBe("하로");
    expect(kanaToHangulWithTokenizer("ハロー", tk)).toBe("하로"); // ー drop
    expect(kanaToHangulWithTokenizer("ハローさん", tk)).toBe("하로상"); // ー drop + さん
  });

  it("ハロー + particle は", () => {
    expect(kanaToHangulWithTokenizer("ハローさんはあいさつです", tk)).toBe(
      "하로상와아이사츠데스",
    );
  });
});
