interface TJSongItemRaw {
  isuse: number;
  update_id: string;
  save_date: number;
  po_song_singer: string;
  ot_code: string;
  po_hit_view: string;
  po_subject: string;
  po_content: string;
  update_date: number;
  po_passwd: string;
  RNUM: number;
  po_hit: number;
  po_regdate_view: string;
  po_regdate: string;
  dt_code: string;
  po_name: string;
  po_ip: string;
  po_song_title: string;
  po_ani: boolean;
  idx: number;
  po_email2: string;
  save_id: string;
  po_email1: string;
}

export interface TJSongItem extends TJSongItemRaw {
  fetchedPageNo: number;
}

interface TJSearchData {
  pageRowCnt: number;
  urlPrefix: string;
  po_song_singer: string;
  nowDay: string;
  nowTime: string;
  viewData: {
    pageCnt: number;
    totalCnt: number;
    list: TJSongItemRaw[];
  };
  pageNo: string;
  clientIp: string;
  po_song_title: string;
  isMobile: boolean;
}

interface TJSearchResponse {
  result: string;
  code: string;
  GNB_MENU: any[];
  message: string;
  data: TJSearchData;
}

/**
 * 단일 페이지 조회 (내부용)
 */
async function fetchPage(singer: string, pageNo: number): Promise<TJSongItemRaw[]> {
  const res = await fetch("https://www.tjmedia.com/song/searchPropose", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      po_song_singer: singer,
      po_song_title: "",
      pageNo: pageNo.toString(),
    }),
  });

  if (!res.ok) {
    throw new Error(`TJ API request failed: ${res.status} ${res.statusText}`);
  }

  const json: TJSearchResponse = await res.json();
  return json.data.viewData.list;
}

/**
 * TJ 신청곡 검색
 * @param singer 가수명
 * @param pageNo 페이지 번호 (undefined이면 모든 페이지를 가져와서 전체 곡 목록 반환)
 * @returns 곡 목록 (각 아이템에 fetchedPageNo 포함)
 */
export async function searchTJPropose(
  singer: string,
  pageNo?: number,
): Promise<TJSongItem[]> {
  if (pageNo !== undefined) {
    const songs = await fetchPage(singer, pageNo);
    return songs.map((song) => ({ ...song, fetchedPageNo: pageNo }));
  }

  const allSongs: TJSongItem[] = [];
  let currentPage = 1;

  while (true) {
    const songs = await fetchPage(singer, currentPage);

    if (songs.length === 0) {
      break;
    }

    allSongs.push(...songs.map((song) => ({ ...song, fetchedPageNo: currentPage })));
    currentPage++;
  }

  return allSongs;
}
