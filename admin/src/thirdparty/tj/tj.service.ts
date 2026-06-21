import type { TjSongData } from "./types";

export class TjService {
  async fetchSongsFromYearMonth(yearMonth: string): Promise<TjSongData[]> {
    try {
      const response = await fetch(
        "https://www.tjmedia.com/legacy/api/newSongOfMonth",
        {
          method: "POST",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            searchYm: yearMonth,
          }),
        },
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (!isTjMonthResponse(data)) {
        return [];
      }

      return data.resultData.items.map((item) => ({
        karaokeNo: item.pro.toString(),
        title: item.indexTitle,
        artist: item.indexSong,
        lyricist: item.word,
        composer: item.com,
        thumbnailImg: item.thumbnailImg,
        publishdate: item.publishdate,
        isMV: item.mv_yn === "Y",
      }));
    } catch {
      return [];
    }
  }

}

interface TjMonthResponse {
  resultCode: string;
  resultData: {
    items: Array<{
      pro: string | number;
      indexTitle: string;
      indexSong: string | null;
      word: string;
      com: string;
      thumbnailImg?: string;
      publishdate: string;
      mv_yn?: string;
    }>;
  };
}

function isTjMonthResponse(data: unknown): data is TjMonthResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  const response = data as Partial<TjMonthResponse>;
  return response.resultCode === "99" && Array.isArray(response.resultData?.items);
}
