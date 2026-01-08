import { sanitizeSearchText } from "./sanitize-query.util";

describe("sanitizeSearchText", () => {
  it("normalizes composite characters and removes feat info", () => {
    const input = "好きだから。（feat.れん)/ 『ユイカ』【MV】";
    expect(sanitizeSearchText(input)).toBe("好きだから。 ユイカ");
  });

  it("removes inline feat without parentheses", () => {
    expect(sanitizeSearchText("Song feat.ABC Artist")).toBe("Song Artist");
  });

  it("strips brackets around artist name", () => {
    expect(sanitizeSearchText("『ユイカ』")).toBe("ユイカ");
  });

  it("removes Re-Recording brackets", () => {
    const input = "好きだから。（Re-Recording）/ 『ユイカ』【MV】";
    expect(sanitizeSearchText(input)).toBe("好きだから。 ユイカ");
  });

  it("returns empty string for falsy input", () => {
    expect(sanitizeSearchText("   ")).toBe("");
    expect(sanitizeSearchText(undefined)).toBe("");
  });
});
