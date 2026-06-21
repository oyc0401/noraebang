import { getCatalog } from "./getCatalog";

describe("getCatalog", () => {
  it("returns JPOP when the title contains Japanese kana", () => {
    expect(getCatalog("ただ君に晴れ", "테스트가수")).toBe("JPOP");
    expect(getCatalog("アイドル", "테스트가수")).toBe("JPOP");
  });

  it("returns JPOP when the artist contains Japanese kana", () => {
    expect(getCatalog("테스트", "ずっと真夜中でいいのに。")).toBe("JPOP");
    expect(getCatalog("테스트", "ヨルシカ")).toBe("JPOP");
  });

  it("returns KPOP for Korean songs without Japanese text", () => {
    expect(getCatalog("사랑은 늘 도망가", "임영웅")).toBe("KPOP");
  });

  it("returns null for English-only songs because the catalog cannot be inferred", () => {
    expect(getCatalog("Human Nature", "Michael Jackson")).toBeNull();
  });

  it("returns KPOP for Korean title with null artist", () => {
    expect(getCatalog("테스트", null)).toBe("KPOP");
  });
});
