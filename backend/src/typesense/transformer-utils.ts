import { toHiragana, toKatakana } from "wanakana";
import { cleanText, normalizeSpacing, removeSpaces } from "./lib/text-utils";

/**
 * 기준 값과 다른 변형 문자열을 Set에 추가한다.
 */
const addIfDifferent = (
  values: Set<string>,
  candidate?: string,
  reference?: string,
) => {
  if (!candidate) {
    return;
  }
  if (!reference || candidate !== reference) {
    values.add(candidate);
  }
};

/**
 * 일본어 문자열에서 공백과 구두점을 제거해 정규화한다.
 */
const normalizeJapaneseSource = (text?: string) => {
  if (!text) {
    return undefined;
  }
  const normalized = cleanText(removeSpaces(text));
  return normalized.length > 0 ? normalized : undefined;
};

/**
 * 히라가나/카타카나 변환과 공백 제거 버전을 모두 Set에 저장한다.
 */
function addJapaneseVariants(
  values: Set<string>,
  text?: string,
  options?: { includeNormalized?: boolean },
) {
  if (!text) {
    return;
  }

  const includeNormalized = options?.includeNormalized ?? true;
  const normalized = includeNormalized ? normalizeJapaneseSource(text) : undefined;

  addIfDifferent(values, toHiragana(text, { passRomaji: true }), text);
  addIfDifferent(values, toKatakana(text, { passRomaji: true }), text);

  if (!normalized) {
    return;
  }

  addIfDifferent(values, normalized, text);
  addIfDifferent(values, toHiragana(normalized, { passRomaji: true }), normalized);
  addIfDifferent(values, toKatakana(normalized, { passRomaji: true }), normalized);
}

/**
 * 공백과 특수문자를 제거한 정규화 텍스트를 반환한다.
 */
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

/**
 * 정규화된 문자열을 Set에 추가한다.
 */
export function addNormalizedValue(values: Set<string>, text?: string) {
  const normalized = normalizeBasic(text);
  if (normalized) {
    values.add(normalized);
  }
}

/**
 * 일본어 변형과 정규화 버전을 모두 Set에 추가한다.
 */
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

/**
 * 단일 정규화 값 배열을 생성한다.
 */
export function buildNormalizedValues(
  value?: string,
): string[] | undefined {
  const normalized = normalizeBasic(value);
  return normalized ? [normalized] : undefined;
}

/**
 * 일본어 변형을 모두 포함한 정규화 값 배열을 생성한다.
 */
export function buildJapaneseNormalizedValues(
  value?: string,
): string[] | undefined {
  const values = new Set<string>();
  addJapaneseNormalizedValues(values, value);
  return values.size > 0 ? Array.from(values) : undefined;
}

/**
 * 원본과 공백 정규화 버전을 포함한 기본 검색 값을 생성한다.
 */
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
