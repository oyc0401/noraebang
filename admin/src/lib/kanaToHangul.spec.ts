// test/kanaToHangul.test.ts
import { kanaToHangul } from "./kanaToHangul";

describe("kanaToHangul", () => {
  it("basic hiragana", () => {
    expect(kanaToHangul("こんにちは")).toBe("콘니치하");
    expect(kanaToHangul("さようなら")).toBe("사요나라"); // おう/よう 장음은 제거
  });

  it("youon (きゃ/しゅ/ちょ)", () => {
    expect(kanaToHangul("きゃく")).toBe("캬쿠");
    expect(kanaToHangul("しゅくだい")).toBe("슈쿠다이");
    expect(kanaToHangul("ちょっと")).toBe("춋토");
  });

  it("sokuon (small っ)", () => {
    expect(kanaToHangul("かった")).toBe("캇타");
    expect(kanaToHangul("きって")).toBe("킷테");
    expect(kanaToHangul("いって")).toBe("잇테");
  });

  it("drop long-vowel-like markers (おう/よう/えい)", () => {
    expect(kanaToHangul("さようなら")).toBe("사요나라"); // よ + [う drop]
    expect(kanaToHangul("せんせい")).toBe("센세"); // せ + [い drop]
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

  it("unknown chars pass-through", () => {
    expect(kanaToHangul("東京(きょう)")).toBe("東京(쿄)");
  });

  it("특별 사전 매핑 (따로 처리)", () => {
    expect(kanaToHangul("とうきょう")).toBe("도쿄");
  });
});
