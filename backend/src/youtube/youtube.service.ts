import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class YoutubeService {
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
}
