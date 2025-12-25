import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class YoutubeService {
  private readonly API_KEY = process.env.YOUTUBE_API_KEY;
  private readonly API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

  async getOembedData(url: string) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch YouTube data',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch YouTube data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 아티스트 이름으로 YouTube 채널 검색
   */
  async searchArtistChannel(artistName: string) {
    if (!this.API_KEY) {
      throw new HttpException(
        'YouTube API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      const url = `${this.API_BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(artistName)}&maxResults=1&key=${this.API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new HttpException(
          'Failed to search artist channel',
          response.status
        );
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return null;
      }

      const channel = data.items[0];
      return {
        channelId: channel.id.channelId,
        channelUrl: `https://www.youtube.com/channel/${channel.id.channelId}`,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default.url,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to search artist channel',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
