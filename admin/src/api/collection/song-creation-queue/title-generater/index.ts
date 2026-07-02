import { searchBraveWebResults } from "../../../../lib/brave-search";
import { getTitleFromAI } from "./ai";

export async function getTitleKo(
  songTitle: string,
  artistName: string | null,
): Promise<string> {
  const title = songTitle.trim();

  if (!title) {
    return "";
  }

  if (hasHangul(title) || isNumberOnly(title)) {
    return title;
  }

  if (!hasSearchWorthyText(title)) {
    return title;
  }

  const artist = artistName?.trim() || null;
  const query = artist ? `${title} ${artist} 노래 한국어 제목` : `${title} 노래 한국어 제목`;
  const searchResults = await searchBraveWebResults(query);

  return getTitleFromAI(title, artist, searchResults);
}

function hasHangul(value: string): boolean {
  return /[가-힣]/.test(value);
}

function isNumberOnly(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

function hasSearchWorthyText(value: string): boolean {
  return /[a-zA-Z぀-ヿ一-龯]/.test(value);
}
