import * as cheerio from "cheerio";
import type { TjSongInfo } from "./types";

export function parseTjSongList(html: string): TjSongInfo[] {
  const $ = cheerio.load(html);
  const songs: TjSongInfo[] = [];

  $("ul.chart-list-area > li").each((index, row) => {
    if (index === 0) return;

    const $row = $(row);
    const songNumber = $row.find(".grid-item.pos-type .num2").text().trim();
    if (!songNumber) return;

    const icoContainer = $row.find(".grid-item.title3 .ico-flex ul");
    const isMR = icoContainer.find(".ico.mr").length > 0;
    const isMV = icoContainer.find(".ico.mv").length > 0;
    const isOver60 = icoContainer.find(".ico.exclusive").length > 0;

    const title = $row
      .find(".grid-item.title3 .ico-flex > p span")
      .text()
      .trim();
    if (!title) return;

    const artist = $row.find(".grid-item.title4.singer span").text().trim();
    const lyricist = $row.find(".grid-item.title5 span").text().trim();
    const composer = $row.find(".grid-item.title6 span").text().trim();
    const youtubeLink = $row.find(".grid-item.youtube a").attr("href");

    songs.push({
      songNumber,
      isMR,
      isMV,
      isOver60,
      title,
      artist,
      lyricist: lyricist || undefined,
      composer: composer || undefined,
      youtubeLink,
    });
  });

  return songs;
}

export function getTjSearchTotalPages(html: string): number {
  const $ = cheerio.load(html);
  const pageListText = $("li.page-list ul.page-num li:last-child a").text();
  const totalPages = Number.parseInt(pageListText, 10);
  return Number.isNaN(totalPages) ? 1 : totalPages;
}
