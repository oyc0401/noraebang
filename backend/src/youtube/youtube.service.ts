import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArtistsService } from '../artists/artists.service';

export interface ChannelSearchResult {
  channelId: string;
  title: string;
  description: string;
  customUrl: string | null;
  thumbnail: string | undefined;
  subscriberCount: number | null;
  videoCount: number | null;
  country: string | null;
}

export interface ChannelDetails {
  channelId: string;
  title: string;
  description: string;
  customUrl: string | null;
  publishedAt: string;
  country: string | null;
  defaultLanguage: string | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: bigint | null;
  hiddenSubscriberCount: boolean;
  uploadsPlaylistId: string | null;
}

export interface OfficialChannelResult {
  officialChannelId: string;
  title: string;
  customUrl: string | null;
  description: string;
  thumbnail: string | undefined;
  subscriberCount: number | null;
  videoCount: number | null;
  videosAnalyzed: number;
  confidence: number;
}

@Injectable()
export class YoutubeService {
  private readonly API_KEY = process.env.YOUTUBE_API_KEY;
  private readonly API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

  constructor(
    private prisma: PrismaService,
    private artistsService: ArtistsService,
  ) {}

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
  async searchChannels(artistName: string): Promise<ChannelSearchResult[]> {
    if (!this.API_KEY) {
      throw new HttpException(
        'YouTube API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      // 1. Search API로 채널 검색 (최대 10개)
      const searchUrl = `${this.API_BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(artistName)}&maxResults=10&key=${this.API_KEY}`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        throw new HttpException(
          'Failed to search channels',
          searchResponse.status
        );
      }

      const searchData = await searchResponse.json();

      if (!searchData.items || searchData.items.length === 0) {
        return [];
      }

      // 2. 채널 ID 목록 추출
      const channelIds = searchData.items.map((item: any) => item.id.channelId);

      // 3. Channels API로 상세 정보 가져오기
      const channelsUrl = `${this.API_BASE_URL}/channels?part=snippet,statistics&id=${channelIds.join(',')}&key=${this.API_KEY}`;
      const channelsResponse = await fetch(channelsUrl);

      if (!channelsResponse.ok) {
        throw new HttpException(
          'Failed to fetch channel details',
          channelsResponse.status
        );
      }

      const channelsData = await channelsResponse.json();

      if (!channelsData.items || channelsData.items.length === 0) {
        return [];
      }

      // 4. 결과 포맷팅
      return channelsData.items.map((channel: any) => ({
        channelId: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description || '',
        customUrl: channel.snippet.customUrl || null,
        thumbnail: channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url,
        subscriberCount: channel.statistics.subscriberCount ? parseInt(channel.statistics.subscriberCount) : null,
        videoCount: channel.statistics.videoCount ? parseInt(channel.statistics.videoCount) : null,
        country: channel.snippet.country || null,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to search channels',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 채널 ID 또는 @handle로 상세 정보 가져오기
   */
  async getChannelDetails(channelId: string): Promise<ChannelDetails> {
    if (!this.API_KEY) {
      throw new HttpException(
        'YouTube API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      // @handle 형식이면 forHandle 파라미터 사용, 아니면 id 파라미터 사용
      let url: string;
      if (channelId.startsWith('@')) {
        const handle = channelId.substring(1); // @ 제거
        url = `${this.API_BASE_URL}/channels?part=snippet,statistics,contentDetails&forHandle=${handle}&key=${this.API_KEY}`;
      } else {
        url = `${this.API_BASE_URL}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${this.API_KEY}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `YouTube API error: ${response.status}`;

        throw new HttpException(
          {
            statusCode: response.status,
            message: errorMessage,
            details: errorData,
          },
          response.status
        );
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
      }

      const channel = data.items[0];
      const snippet = channel.snippet;
      const statistics = channel.statistics;
      const contentDetails = channel.contentDetails;
      const thumbnails = snippet.thumbnails;

      return {
        channelId: channel.id,
        title: snippet.title,
        description: snippet.description || '',
        customUrl: snippet.customUrl || null,
        publishedAt: snippet.publishedAt,
        country: snippet.country || null,
        defaultLanguage: snippet.defaultLanguage || null,
        thumbnailDefault: thumbnails.default?.url || null,
        thumbnailMedium: thumbnails.medium?.url || null,
        thumbnailHigh: thumbnails.high?.url || null,
        subscriberCount: statistics.subscriberCount ? parseInt(statistics.subscriberCount) : null,
        videoCount: statistics.videoCount ? parseInt(statistics.videoCount) : null,
        viewCount: statistics.viewCount ? BigInt(statistics.viewCount) : null,
        hiddenSubscriberCount: statistics.hiddenSubscriberCount || false,
        uploadsPlaylistId: contentDetails.relatedPlaylists?.uploads || null,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch channel details',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 선택한 채널 ID로 아티스트의 YouTube 채널 정보 업데이트
   */
  async updateArtistChannel(alias: string, channelId: string) {
    try {
      // 1. 아티스트 찾기
      const artist = await this.prisma.artist.findUnique({
        where: { alias },
      });

      if (!artist) {
        throw new HttpException('Artist not found', HttpStatus.NOT_FOUND);
      }

      // 2. 채널 상세 정보 가져오기 (서비스 메서드 사용)
      const channelData = await this.getChannelDetails(channelId);

      // 3. Artist의 channelId 업데이트
      await this.prisma.artist.update({
        where: { id: artist.id },
        data: { youtubeChannelId: channelData.channelId },
      });

      // 4. YoutubeChannel 테이블 upsert
      await this.prisma.youtubeChannel.upsert({
        where: { artistId: artist.id },
        create: {
          artistId: artist.id,
          channelId: channelData.channelId,
          title: channelData.title,
          description: channelData.description,
          customUrl: channelData.customUrl,
          publishedAt: new Date(channelData.publishedAt),
          country: channelData.country,
          defaultLanguage: channelData.defaultLanguage,
          thumbnailDefault: channelData.thumbnailDefault,
          thumbnailMedium: channelData.thumbnailMedium,
          thumbnailHigh: channelData.thumbnailHigh,
          subscriberCount: channelData.subscriberCount,
          videoCount: channelData.videoCount,
          viewCount: channelData.viewCount,
          hiddenSubscriberCount: channelData.hiddenSubscriberCount,
          uploadsPlaylistId: channelData.uploadsPlaylistId,
          fetchedAt: new Date(),
        },
        update: {
          channelId: channelData.channelId,
          title: channelData.title,
          description: channelData.description,
          customUrl: channelData.customUrl,
          publishedAt: new Date(channelData.publishedAt),
          country: channelData.country,
          defaultLanguage: channelData.defaultLanguage,
          thumbnailDefault: channelData.thumbnailDefault,
          thumbnailMedium: channelData.thumbnailMedium,
          thumbnailHigh: channelData.thumbnailHigh,
          subscriberCount: channelData.subscriberCount,
          videoCount: channelData.videoCount,
          viewCount: channelData.viewCount,
          hiddenSubscriberCount: channelData.hiddenSubscriberCount,
          uploadsPlaylistId: channelData.uploadsPlaylistId,
          fetchedAt: new Date(),
        },
      });

      // 캐시 초기화 (아티스트 목록 새로고침을 위해)
      this.artistsService.clearCache();

      return {
        artist: artist.name,
        channelId: channelData.channelId,
        channelTitle: channelData.title,
        subscriberCount: channelData.subscriberCount,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update artist channel',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 채널의 재생목록들 가져오기 (모든 재생목록)
   */
  async getPlaylistsFromChannel(channelId: string, maxResults: number = 100): Promise<{
    playlistId: string;
    title: string;
    description: string;
    itemCount: number;
    publishedAt: string;
  }[]> {
    if (!this.API_KEY) {
      throw new HttpException(
        'YouTube API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      const url = `${this.API_BASE_URL}/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=${maxResults}&key=${this.API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `YouTube API error: ${response.status}`;

        throw new HttpException(
          {
            statusCode: response.status,
            message: errorMessage,
            details: errorData,
          },
          response.status
        );
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      return data.items.map((item: any) => ({
        playlistId: item.id,
        title: item.snippet.title,
        description: item.snippet.description || '',
        itemCount: item.contentDetails.itemCount || 0,
        publishedAt: item.snippet.publishedAt,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch channel playlists',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 채널의 모든 동영상 가져오기 (uploads 재생목록 사용 - 쿼터 1)
   */
  async getVideosFromChannel(channelId: string, maxResults: number = 50): Promise<{
    videoId: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnailUrl: string | null;
  }[]> {
    if (!this.API_KEY) {
      throw new HttpException(
        'YouTube API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      // 1. 채널 정보에서 uploads playlist ID 가져오기 (캐시된 경우 DB에서)
      const channelDetails = await this.getChannelDetails(channelId);

      if (!channelDetails.uploadsPlaylistId) {
        throw new HttpException(
          'Uploads playlist not found',
          HttpStatus.NOT_FOUND
        );
      }

      // 2. uploads playlist에서 동영상 가져오기 (playlistItems API - 쿼터 1)
      const playlistVideos = await this.getVideosFromPlaylist(
        channelDetails.uploadsPlaylistId,
        maxResults
      );

      // 3. 형식 변환
      return playlistVideos.map((video) => ({
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        publishedAt: video.publishedAt,
        thumbnailUrl: null, // playlistItems에는 썸네일이 포함되어 있지만 여기선 생략
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch channel videos',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 재생목록의 동영상들 가져오기
   */
  async getVideosFromPlaylist(playlistId: string, maxResults: number = 100): Promise<{
    videoId: string;
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
  }[]> {
    if (!this.API_KEY) {
      throw new HttpException(
        'YouTube API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      const url = `${this.API_BASE_URL}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${this.API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `YouTube API error: ${response.status}`;

        throw new HttpException(
          {
            statusCode: response.status,
            message: errorMessage,
            details: errorData,
          },
          response.status
        );
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      return data.items.map((item: any) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description || '',
        publishedAt: item.snippet.publishedAt,
        channelId: item.snippet.videoOwnerChannelId || item.snippet.channelId,
        channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch playlist videos',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
