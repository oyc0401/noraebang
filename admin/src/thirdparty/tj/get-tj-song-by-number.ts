import { fetchTjSearchPage } from "./http";
import { parseTjSongList } from "./parse-tj-song-list";
import type { TjSongInfo } from "./types";

export async function getTjSongByNumber(
  songNumber: string,
): Promise<TjSongInfo> {
  const html = await fetchTjSearchPage(
    new URLSearchParams({
      nationType: "",
      strType: "16",
      searchTxt: songNumber,
      strWord: "Y",
    }),
  );

  const songs = parseTjSongList(html);

  if (songs.length === 0) {
    throw new Error("No song found for the given song number");
  }

  if (songs.length > 1) {
    throw new Error(
      `Multiple songs found (${songs.length}) for the given song number. Expected exactly one.`,
    );
  }

  return songs[0];
}
