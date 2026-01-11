import * as cheerio from "cheerio";
import type { TJSongInfo } from "./type/TJSongInfo";

async function fetchTJPageByNumber(songNumber: string): Promise<string> {
  const params = new URLSearchParams({
    nationType: "",
    strType: "16",
    searchTxt: songNumber,
    strWord: "Y",
  });

  const url = `https://www.tjmedia.com/song/accompaniment_search?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`TJ request failed: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

function parseSongInfo(html: string): TJSongInfo {
  const $ = cheerio.load(html);
  const songs: TJSongInfo[] = [];

  $("ul.chart-list-area > li").each((index, row) => {
    // 첫 번째 li는 헤더이므로 스킵
    if (index === 0) return;

    const $row = $(row);

    // 곡번호
    const songNumber = $row.find(".grid-item.pos-type .num2").text().trim();
    if (!songNumber) return;

    // MR/MV/60이상 확인
    const icoContainer = $row.find(".grid-item.title3 .ico-flex ul");
    const isMR = icoContainer.find(".ico.mr").length > 0;
    const isMV = icoContainer.find(".ico.mv").length > 0;
    const isOver60 = icoContainer.find(".ico.exclusive").length > 0;

    // 제목
    const title = $row
      .find(".grid-item.title3 .ico-flex > p span")
      .text()
      .trim();
    if (!title) return;

    // 가수
    const artist = $row.find(".grid-item.title4.singer span").text().trim();

    // 작사가
    const lyricistText = $row.find(".grid-item.title5 span").text().trim();
    const lyricist = lyricistText || undefined;

    // 작곡가
    const composerText = $row.find(".grid-item.title6 span").text().trim();
    const composer = composerText || undefined;

    // 유튜브링크
    const youtubeLinkElement = $row.find(".grid-item.youtube a");
    const youtubeLink =
      youtubeLinkElement.length > 0
        ? youtubeLinkElement.attr("href")
        : undefined;

    songs.push({
      songNumber,
      isMR,
      isMV,
      isOver60,
      title,
      artist,
      lyricist,
      composer,
      youtubeLink,
    });
  });

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

export async function getTJSongByNumber(
  songNumber: string,
): Promise<TJSongInfo> {
  console.log(`[TJ] Fetching song by number: ${songNumber}`);

  const html = await fetchTJPageByNumber(songNumber);
  const song = parseSongInfo(html);

  console.log(`[TJ] Song found: ${song.title} - ${song.artist}`);
  return song;
}
