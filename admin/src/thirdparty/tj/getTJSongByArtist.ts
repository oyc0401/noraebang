import * as cheerio from "cheerio";

export interface TJSongInfo {
  songNumber: string;
  isMR: boolean;
  isMV: boolean;
  isOver60: boolean;
  title: string;
  artist: string;
  lyricist?: string;
  composer?: string;
  youtubeLink?: string;
}

async function fetchTJPage(
  artistName: string,
  pageNo: number,
): Promise<string> {
  const params = new URLSearchParams({
    pageNo: pageNo.toString(),
    pageRowCnt: "15",
    strSotrGubun: "ASC",
    strSortType: "",
    nationType: "",
    strType: "2",
    searchTxt: artistName,
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

function getTotalPages(html: string): number {
  const $ = cheerio.load(html);
  const pageListText = $("li.page-list ul.page-num li:last-child a").text();
  const totalPages = Number.parseInt(pageListText, 10);
  return Number.isNaN(totalPages) ? 1 : totalPages;
}

function parseSongList(html: string): TJSongInfo[] {
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
    const title = $row.find(".grid-item.title3 .ico-flex > p span").text().trim();
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
    const youtubeLink = youtubeLinkElement.length > 0
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

  return songs;
}

export async function getTJSongByArtist(
  artistName: string,
): Promise<TJSongInfo[]> {
  console.log(`[TJ] Fetching songs for artist: ${artistName}`);

  // 첫 페이지를 가져와서 전체 페이지 수 확인
  const firstPageHtml = await fetchTJPage(artistName, 1);
  const totalPages = getTotalPages(firstPageHtml);

  console.log(`[TJ] Total pages: ${totalPages}`);

  // 첫 페이지 파싱
  const allSongs: TJSongInfo[] = parseSongList(firstPageHtml);
  console.log(`[TJ] Page 1/${totalPages}: ${allSongs.length} songs`);

  // 나머지 페이지들을 병렬로 가져오기
  if (totalPages > 1) {
    const pagePromises: Promise<TJSongInfo[]>[] = [];

    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(
        fetchTJPage(artistName, page)
          .then((html) => {
            const songs = parseSongList(html);
            console.log(`[TJ] Page ${page}/${totalPages}: ${songs.length} songs`);
            return songs;
          })
          .catch((error) => {
            console.error(`[TJ] Error fetching page ${page}:`, error);
            return [];
          }),
      );
    }

    const pageSongs = await Promise.all(pagePromises);
    for (const songs of pageSongs) {
      allSongs.push(...songs);
    }
  }

  console.log(`[TJ] Total songs fetched: ${allSongs.length}`);
  return allSongs;
}
