import { fetchTjSearchPage } from "./lib/userAgent";
import { getTjSearchTotalPages, parseTjSongList } from "./lib/crawling";
import { recordExecution } from "./log/log-store";
import type { TjSongInfo } from "../types";

const SEARCH_BY_ARTIST_LOG_KEY = "searchByArtist";

async function fetchTjPageByArtist(
  artistName: string,
  pageNo: number,
): Promise<string> {
  return await fetchTjSearchPage(
    new URLSearchParams({
      pageNo: pageNo.toString(),
      pageRowCnt: "15",
      strSotrGubun: "ASC",
      strSortType: "",
      nationType: "",
      strType: "2",
      searchTxt: artistName,
    }),
  );
}

export async function searchByArtist(
  artistName: string,
): Promise<TjSongInfo[]> {
  await recordExecution(SEARCH_BY_ARTIST_LOG_KEY);

  const firstPageHtml = await fetchTjPageByArtist(artistName, 1);
  const totalPages = getTjSearchTotalPages(firstPageHtml);
  const allSongs = parseTjSongList(firstPageHtml);

  if (totalPages <= 1) {
    return allSongs;
  }

  const pageSongs = await Promise.all(
    Array.from({ length: totalPages - 1 }, async (_, index) => {
      const pageNo = index + 2;

      try {
        const html = await fetchTjPageByArtist(artistName, pageNo);
        return parseTjSongList(html);
      } catch {
        return [];
      }
    }),
  );

  for (const songs of pageSongs) {
    allSongs.push(...songs);
  }

  return allSongs;
}
