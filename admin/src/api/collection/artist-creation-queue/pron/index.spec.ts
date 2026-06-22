import { describe, expect, it } from "vitest";
import { getJaPron, getLatinPron } from ".";

describe("artist creation pron", () => {
  it("converts Japanese kana to Korean pronunciation", async () => {
    await expect(getJaPron("ぐみ")).resolves.toBe("구미");
  });

  it("converts latin text to Korean pronunciation", () => {
    expect(getLatinPron("GUMI")).toBe("구미");
  });

  it("returns null for blank input", async () => {
    await expect(getJaPron("  ")).resolves.toBeNull();
    expect(getLatinPron("  ")).toBeNull();
  });
});
