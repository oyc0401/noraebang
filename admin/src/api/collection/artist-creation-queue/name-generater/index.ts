import { getNameFromAI } from "./ai";
import { searchBraveWebResults } from "./brave-search";

export async function getNameKo(artistName: string): Promise<string> {
  const name = artistName.trim();

  if (!name) {
    return "";
  }

  if (hasHangul(name) || isNumberOnly(name)) {
    return name;
  }

  if (!hasSearchWorthyText(name)) {
    return name;
  }

  const searchResults = await searchBraveWebResults(name);

  return getNameFromAI(name, searchResults);
}

function hasHangul(value: string): boolean {
  return /[가-힣]/.test(value);
}

function isNumberOnly(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

function hasSearchWorthyText(value: string): boolean {
  return /[a-zA-Z\u3040-\u30ff\u4e00-\u9faf]/.test(value);
}
