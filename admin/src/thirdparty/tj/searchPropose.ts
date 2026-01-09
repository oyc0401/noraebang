interface TJSongItem {
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

interface TJSearchData {
  pageRowCnt: number;
  urlPrefix: string;
  po_song_singer: string;
  nowDay: string;
  nowTime: string;
  viewData: {
    pageCnt: number;
    totalCnt: number;
    list: TJSongItem[];
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

export async function searchTJPropose(
  singer: string,
  title: string,
  pageNo: number,
): Promise<TJSearchData> {
  const res = await fetch("https://www.tjmedia.com/song/searchPropose", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      po_song_singer: singer,
      po_song_title: title,
      pageNo: pageNo.toString(),
    }),
  });

  if (!res.ok) {
    throw new Error(`TJ API request failed: ${res.status} ${res.statusText}`);
  }

  const json: TJSearchResponse = await res.json();
  return json.data;
}
