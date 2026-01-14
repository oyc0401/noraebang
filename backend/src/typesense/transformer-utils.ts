import { toHiragana, toKatakana } from "wanakana";
import { removePunctuation, normalizeBasic } from "./lib/text-utils";

/**
 * undefinded 필터링하는 타입.
 * ex) list.filter(isDefinded);
 */
export const isPresent = <T>(v: T | null | undefined): v is T =>
  v !== null && v !== undefined;

/**
 * 원본과 툭수문자 정규화 버전을 포함한 기본 검색 값을 생성한다.
 */
export function getPrimaryValues(text: string): string[] {
  const results = new Set<string>();
  results.add(text);
  results.add(removePunctuation(text));

  return Array.from(results);
}

export function getPrimaryValuesByList(textList: string[]): string[] {
  const results = new Set<string>();

  for (const text of textList) {
    results.add(text);
    results.add(removePunctuation(text));
  }

  return Array.from(results);
}

export function getNormalizedValues(text: string): string[] {
  const results = new Set<string>();
  results.add(normalizeBasic(text));

  return Array.from(results);
}

export function getNormalizedValuesByList(textList: string[]): string[] {
  const results = new Set<string>();

  for (const text of textList) {
    results.add(normalizeBasic(text));
  }

  return Array.from(results);
}

/**
 * 일본어 정규화 버전 검색값을 생성한다.
 */
export function getJapaneseNormalizedValues(text: string): string[] {
  const values = new Set<string>();

  const noPunctation = removePunctuation(text);

  values.add(noPunctation);
  values.add(toHiragana(noPunctation, { passRomaji: true }));
  values.add(toKatakana(noPunctation, { passRomaji: true }));

  const normalized = normalizeBasic(text);

  values.add(normalized);
  values.add(toHiragana(normalized, { passRomaji: true }));
  values.add(toKatakana(normalized, { passRomaji: true }));

  return Array.from(values);
}

/**
 * 발음 검색용 토큰 생성
 */
export function getPronunciationValues(text: string): string[] {
  const values = new Set<string>();
  const add = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    if (trimmed.length > 0) {
      values.add(trimmed);
    }
  };

  add(text);
  add(removePunctuation(text));
  add(normalizeBasic(text));

  return Array.from(values);
}
