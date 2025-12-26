import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface TJSongData {
  karaokeNo: string;
  title: string;
  artist: string;
  lyricist: string;
  composer: string;
  nationType: string;
}

@Injectable()
export class TJService {
  private readonly BASE_URL =
    'https://www.tjmedia.com/song/accompaniment_search';
  private readonly RECENT_SONG_URL = 'https://www.tjmedia.com/song/recent_song';

  /**
   * 최신곡 페이지에서 곡번호 목록 추출
   */
  async fetchRecentSongNumbers(): Promise<string[]> {
    try {
      const response = await fetch(this.RECENT_SONG_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const songNumbers: string[] = [];

      // 최신곡 목록에서 곡번호 추출
      $('body')
        .find('*')
        .each((_, element) => {
          const text = $(element).text().trim();
          // 5-6자리 숫자 패턴 찾기 (TJ 곡번호)
          const matches = text.match(/^(\d{5,6})$/);
          if (matches) {
            const num = matches[1];
            if (!songNumbers.includes(num)) {
              songNumbers.push(num);
            }
          }
        });

      console.log(`📋 Found ${songNumbers.length} recent song numbers`);
      return songNumbers;
    } catch (error) {
      console.error(`❌ Fetch error for recent songs:`, error);
      return [];
    }
  }

  /**
   * 곡번호로 TJ 곡 검색
   */
  async searchBySongNumber(songNumber: number): Promise<TJSongData | null> {
    const url = `${this.BASE_URL}?nationType=&strType=16&searchTxt=${songNumber}&pageNo=1&pageRowCnt=100`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // 곡번호 검색은 정확히 매칭되는 1곡만 반환
      const row = $('ul.grid-container.list').first();
      if (row.length === 0) {
        return null;
      }

      const items = row.find('li.grid-item');
      if (items.length === 0) {
        return null;
      }

      // 곡번호 추출
      const karaokeNo = $(items[0]).find('.num2').text().trim();
      if (!karaokeNo || karaokeNo !== songNumber.toString()) {
        // 정확히 매칭되지 않으면 무시 (부분 매칭 방지)
        return null;
      }

      // 곡제목 추출
      const title = $(items[1]).find('p span').first().text().trim();

      // 가수 추출
      let artist = $(items[2]).find('.highlight').text().trim();
      if (!artist) {
        artist = $(items[2]).find('p > span > span').first().text().trim();
      }
      if (!artist) {
        artist = $(items[2]).find('p').text().trim();
      }

      // 작사가 추출
      const lyricist = $(items[3]).find('p span').text().trim();

      // 작곡가 추출
      const composer = $(items[4]).find('p span').text().trim();

      if (!title || !artist) {
        return null;
      }

      // 국가 타입 추정 (간단한 휴리스틱)
      let nationType = 'KOR'; // 기본값
      if (
        /[\u3040-\u309F\u30A0-\u30FF]/.test(title) ||
        /[\u3040-\u309F\u30A0-\u30FF]/.test(artist)
      ) {
        nationType = 'JPN';
      } else if (/[a-zA-Z]/.test(title) && !/[가-힣]/.test(title)) {
        nationType = 'ENG';
      }

      return {
        karaokeNo,
        title,
        artist,
        lyricist: lyricist || '',
        composer: composer || '',
        nationType,
      };
    } catch (error) {
      console.error(`❌ Fetch error for song ${songNumber}:`, error);
      return null;
    }
  }
}
