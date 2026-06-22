import { describe, expect, it } from "vitest";
import { toHiragana } from ".";

describe("toHiragana", () => {
  it("converts kanji names to hiragana", async () => {
    await expect(toHiragana("中森明菜")).resolves.toBe("なかもりあきな");
  });

  it("converts katakana names to hiragana", async () => {
    await expect(toHiragana("グミ")).resolves.toBe("ぐみ");
  });

  it("returns an empty string for blank input", async () => {
    await expect(toHiragana("  ")).resolves.toBe("");
  });
});
