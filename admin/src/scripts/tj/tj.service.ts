import * as cheerio from "cheerio";

export interface TJSongData {
  karaokeNo: string;
  title: string;
  artist: string;
  lyricist: string;
  composer: string;
  nationType: string;
}

export class TJService {
  private readonly BASE_URL =
    "https://www.tjmedia.com/song/accompaniment_search";

  /**
   * 특정 년월의 곡 정보 가져오기
   * @param yearMonth - 년월 (예: "202512", "200301" 등)
   */
  async fetchSongsByMonth(yearMonth: string): Promise<TJSongData[]> {
    try {
      console.log(`📅 Fetching songs for ${yearMonth}`);

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
        console.error(`❌ HTTP Error: ${response.status}`);
        return [];
      }

      const data: any = await response.json();

      if (data.resultCode !== "99" || !data.resultData?.items) {
        console.error("❌ Unexpected API response:", data);
        return [];
      }

      const songs: TJSongData[] = data.resultData.items.map((item) => {
        // 국가 타입 추정
        let nationType = "KOR";
        if (
          /[\u3040-\u309F\u30A0-\u30FF]/.test(item.indexTitle) ||
          /[\u3040-\u309F\u30A0-\u30FF]/.test(item.indexSong)
        ) {
          nationType = "JPN";
        } else if (
          /[a-zA-Z]/.test(item.indexTitle) &&
          !/[가-힣]/.test(item.indexTitle)
        ) {
          nationType = "ENG";
        }

        return {
          karaokeNo: item.pro.toString(),
          title: item.indexTitle,
          artist: item.indexSong,
          lyricist: item.word ?? "",
          composer: item.com ?? "",
          nationType,
        };
      });

      console.log(`📋 Found ${songs.length} recent songs`);
      return songs;
    } catch (error) {
      console.error(`❌ Fetch error for recent songs:`, error);
      return [];
    }
  }

  /**
   * 특정 년월부터 현재까지 모든 월의 데이터를 가져오기
   * @param fromYearMonth - 시작 년월 (예: "202001"), 기본값은 "200101"
   */
  async *fetchAllSongs(fromYearMonth: string = "200101"): AsyncGenerator<{
    yearMonth: string;
    songs: TJSongData[];
  }> {
    const startYear = parseInt(fromYearMonth.substring(0, 4), 10);
    const startMonth = parseInt(fromYearMonth.substring(4, 6), 10);
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;

    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;

      for (let month = monthStart; month <= monthEnd; month++) {
        const yearMonth = `${year}${String(month).padStart(2, "0")}`;
        const songs = await this.fetchSongsByMonth(yearMonth);

        yield { yearMonth, songs };

        // Rate limiting: 500ms 대기
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * 곡번호로 TJ 곡 검색
   */
  async searchBySongNumber(
    songNumber: number,
  ): Promise<TJSongData | undefined> {
    const url = `${this.BASE_URL}?nationType=&strType=16&searchTxt=${songNumber}&pageNo=1&pageRowCnt=100`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        return undefined;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // 곡번호 검색은 정확히 매칭되는 1곡만 반환
      const row = $("ul.grid-container.list").first();
      if (row.length === 0) {
        return undefined;
      }

      const items = row.find("li.grid-item");
      if (items.length === 0) {
        return undefined;
      }

      // 곡번호 추출
      const karaokeNo = $(items[0]).find(".num2").text().trim();
      if (!karaokeNo || karaokeNo !== songNumber.toString()) {
        // 정확히 매칭되지 않으면 무시 (부분 매칭 방지)
        return undefined;
      }

      // 곡제목 추출
      const title = $(items[1]).find("p span").first().text().trim();

      // 가수 추출
      let artist = $(items[2]).find(".highlight").text().trim();
      if (!artist) {
        artist = $(items[2]).find("p > span > span").first().text().trim();
      }
      if (!artist) {
        artist = $(items[2]).find("p").text().trim();
      }

      // 작사가 추출
      const lyricist = $(items[3]).find("p span").text().trim();

      // 작곡가 추출
      const composer = $(items[4]).find("p span").text().trim();

      if (!title || !artist) {
        return undefined;
      }

      // 국가 타입 추정 (간단한 휴리스틱)
      let nationType = "KOR"; // 기본값
      if (
        /[\u3040-\u309F\u30A0-\u30FF]/.test(title) ||
        /[\u3040-\u309F\u30A0-\u30FF]/.test(artist)
      ) {
        nationType = "JPN";
      } else if (/[a-zA-Z]/.test(title) && !/[가-힣]/.test(title)) {
        nationType = "ENG";
      }

      return {
        karaokeNo,
        title,
        artist,
        lyricist: lyricist || "",
        composer: composer || "",
        nationType,
      };
    } catch (error) {
      console.error(`❌ Fetch error for song ${songNumber}:`, error);
      return undefined;
    }
  }
}
