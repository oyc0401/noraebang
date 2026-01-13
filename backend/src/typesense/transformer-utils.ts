import {
  cleanText,
  normalizeSpacing,
  removeSpaces,
  toAllHiragana,
  toAllKatakana,
} from "./lib/text-utils";

function addJapaneseVariants(
  values: Set<string>,
  text?: string,
  options?: { includeNormalized?: boolean },
) {
  if (!text) {
    return;
  }

  const includeNormalized = options?.includeNormalized ?? true;
  const noSpaceAndPunct = cleanText(removeSpaces(text));
  if (includeNormalized && noSpaceAndPunct !== text) {
    values.add(noSpaceAndPunct);
  }

  const hiragana = toAllHiragana(text);
  if (hiragana !== text) {
    values.add(hiragana);
  }

  const katakana = toAllKatakana(text);
  if (katakana !== text) {
    values.add(katakana);
  }

  if (includeNormalized) {
    const noSpaceAndPunctHiragana = toAllHiragana(noSpaceAndPunct);
    if (
      noSpaceAndPunctHiragana !== noSpaceAndPunct &&
      noSpaceAndPunctHiragana !== hiragana
    ) {
      values.add(noSpaceAndPunctHiragana);
    }

    const noSpaceAndPunctKatakana = toAllKatakana(noSpaceAndPunct);
    if (
      noSpaceAndPunctKatakana !== noSpaceAndPunct &&
      noSpaceAndPunctKatakana !== katakana
    ) {
      values.add(noSpaceAndPunctKatakana);
    }
  }
}

function normalizeBasic(text?: string) {
  if (!text) {
    return undefined;
  }

  const spaced = normalizeSpacing(text);
  if (!spaced) {
    return undefined;
  }
  const normalized = removeSpaces(spaced);
  return normalized.length > 0 ? normalized : undefined;
}

export function addNormalizedValue(values: Set<string>, text?: string) {
  const normalized = normalizeBasic(text);
  if (normalized) {
    values.add(normalized);
  }
}

export function addJapaneseNormalizedValues(
  values: Set<string>,
  text?: string,
) {
  if (!text) {
    return;
  }
  addJapaneseVariants(values, text);
  const normalized = normalizeBasic(text);
  if (normalized) {
    values.add(normalized);
  }
}

export function buildNormalizedValues(
  value?: string,
): string[] | undefined {
  const normalized = normalizeBasic(value);
  return normalized ? [normalized] : undefined;
}

export function buildJapaneseNormalizedValues(
  value?: string,
): string[] | undefined {
  const values = new Set<string>();
  addJapaneseNormalizedValues(values, value);
  return values.size > 0 ? Array.from(values) : undefined;
}

export function buildPrimaryValues(
  value?: string,
): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeSpacing(value);
  const results = new Set<string>();
  if (value.trim().length > 0) {
    results.add(value);
  }
  if (normalized && normalized !== value) {
    results.add(normalized);
  }
  return results.size > 0 ? Array.from(results) : undefined;
}
