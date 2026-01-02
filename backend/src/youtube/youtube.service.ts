import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { OembedDataDto } from "./dto/oembed-data.dto";

const YoutubeThumbnailSchema = z.object({
  url: z.string(),
});

const YoutubeOembedSchema = z.object({
  title: z.string(),
  author_name: z.string(),
  author_url: z.string(),
  type: z.string(),
  height: z.number().optional(),
  width: z.number().optional(),
  version: z.string(),
  provider_name: z.string(),
  provider_url: z.string(),
  thumbnail_height: z.number().optional(),
  thumbnail_width: z.number().optional(),
  thumbnail_url: z.string().optional(),
  html: z.string().optional(),
});

const YoutubeSearchResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.object({
          channelId: z.string(),
        }),
        snippet: z.object({
          title: z.string(),
          description: z.string().optional(),
          customUrl: z.string().optional(),
          thumbnails: z.object({
            default: YoutubeThumbnailSchema.optional(),
            medium: YoutubeThumbnailSchema.optional(),
          }),
          country: z.string().optional(),
        }),
      }),
    )
    .default([]),
});

const YoutubeChannelResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          description: z.string().optional(),
          customUrl: z.string().optional(),
          country: z.string().optional(),
          defaultLanguage: z.string().optional(),
          publishedAt: z.string(),
          thumbnails: z.object({
            default: YoutubeThumbnailSchema.optional(),
            medium: YoutubeThumbnailSchema.optional(),
            high: YoutubeThumbnailSchema.optional(),
          }),
        }),
        statistics: z.object({
          subscriberCount: z.string().optional(),
          videoCount: z.string().optional(),
          viewCount: z.string().optional(),
          hiddenSubscriberCount: z.boolean().optional(),
        }),
        contentDetails: z
          .object({
            relatedPlaylists: z
              .object({
                uploads: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .default([]),
});

const YoutubePlaylistResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          description: z.string().optional(),
          publishedAt: z.string(),
        }),
        contentDetails: z.object({
          itemCount: z.number().optional(),
        }),
      }),
    )
    .default([]),
});

const YoutubePlaylistItemsResponseSchema = z.object({
  items: z
    .array(
      z.object({
        snippet: z.object({
          resourceId: z.object({
            videoId: z.string(),
          }),
          title: z.string(),
          description: z.string().optional(),
          publishedAt: z.string(),
          channelId: z.string().optional(),
          channelTitle: z.string().optional(),
          videoOwnerChannelId: z.string().optional(),
          videoOwnerChannelTitle: z.string().optional(),
        }),
      }),
    )
    .default([]),
});

export interface ChannelSearchResult {
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnail?: string;
  subscriberCount?: number;
  videoCount?: number;
  country?: string;
}

export interface ChannelDetails {
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  country?: string;
  defaultLanguage?: string;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: bigint;
  hiddenSubscriberCount: boolean;
  uploadsPlaylistId?: string;
}

export interface OfficialChannelResult {
  officialChannelId: string;
  title: string;
  customUrl?: string;
  description: string;
  thumbnail?: string;
  subscriberCount?: number;
  videoCount?: number;
  videosAnalyzed: number;
  confidence: number;
}

@Injectable()
export class YoutubeService {
  private readonly API_KEY = process.env.YOUTUBE_API_KEY;
  private readonly API_BASE_URL = "https://www.googleapis.com/youtube/v3";

  constructor(private prisma: PrismaService) {}

  async getOembedData(url: string): Promise<OembedDataDto> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new HttpException(
          "Failed to fetch YouTube data",
          response.status,
        );
      }

      return YoutubeOembedSchema.parse(await response.json());
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch YouTube data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 아티스트 이름으로 YouTube 채널 검색
   */
  async searchChannels(artistName: string): Promise<ChannelSearchResult[]> {
    if (!this.API_KEY) {
      throw new HttpException(
        "YouTube API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      // 1. Search API로 채널 검색 (최대 10개)
      const searchUrl = `${this.API_BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(artistName)}&maxResults=10&key=${this.API_KEY}`;
      const searchResponse = await fetch(searchUrl);

      if (!searchResponse.ok) {
        throw new HttpException(
          "Failed to search channels",
          searchResponse.status,
        );
      }

      const searchJson: unknown = await searchResponse.json();
      const searchData = YoutubeSearchResponseSchema.parse(searchJson);

      if (searchData.items.length === 0) {
        return [];
      }

      // 2. 채널 ID 목록 추출
      const channelIds = searchData.items.map((item) => item.id.channelId);

      // 3. Channels API로 상세 정보 가져오기
      const channelsUrl = `${this.API_BASE_URL}/channels?part=snippet,statistics&id=${channelIds.join(",")}&key=${this.API_KEY}`;
      const channelsResponse = await fetch(channelsUrl);

      if (!channelsResponse.ok) {
        throw new HttpException(
          "Failed to fetch channel details",
          channelsResponse.status,
        );
      }

      const channelsJson: unknown = await channelsResponse.json();
      const channelsData = YoutubeChannelResponseSchema.parse(channelsJson);

      if (channelsData.items.length === 0) {
        return [];
      }

      // 4. 결과 포맷팅
      return channelsData.items.map((channel) => ({
        channelId: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description ?? "",
        customUrl: channel.snippet.customUrl ?? undefined,
        thumbnail:
          channel.snippet.thumbnails.medium?.url ||
          channel.snippet.thumbnails.default?.url,
        subscriberCount: channel.statistics.subscriberCount
          ? parseInt(channel.statistics.subscriberCount, 10)
          : undefined,
        videoCount: channel.statistics.videoCount
          ? parseInt(channel.statistics.videoCount, 10)
          : undefined,
        country: channel.snippet.country ?? undefined,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to search channels",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 채널 ID 또는 @handle로 상세 정보 가져오기
   */
  async getChannelDetails(channelId: string): Promise<ChannelDetails> {
    if (!this.API_KEY) {
      throw new HttpException(
        "YouTube API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      // @handle 형식이면 forHandle 파라미터 사용, 아니면 id 파라미터 사용
      let url: string;
      if (channelId.startsWith("@")) {
        const handle = channelId.substring(1); // @ 제거
        url = `${this.API_BASE_URL}/channels?part=snippet,statistics,contentDetails&forHandle=${handle}&key=${this.API_KEY}`;
      } else {
        url = `${this.API_BASE_URL}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${this.API_KEY}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message || `YouTube API error: ${response.status}`;

        throw new HttpException(
          {
            statusCode: response.status,
            message: errorMessage,
            details: errorData,
          },
          response.status,
        );
      }

      const data = YoutubeChannelResponseSchema.parse(await response.json());

      if (data.items.length === 0) {
        throw new HttpException("Channel not found", HttpStatus.NOT_FOUND);
      }

      const channel = data.items[0];
      const snippet = channel.snippet;
      const statistics = channel.statistics;
      const contentDetails = channel.contentDetails;
      const thumbnails = snippet.thumbnails;

      return {
        channelId: channel.id,
        title: snippet.title,
        description: snippet.description ?? "",
        customUrl: snippet.customUrl ?? undefined,
        publishedAt: snippet.publishedAt,
        country: snippet.country ?? undefined,
        defaultLanguage: snippet.defaultLanguage ?? undefined,
        thumbnailDefault: thumbnails.default?.url ?? undefined,
        thumbnailMedium: thumbnails.medium?.url ?? undefined,
        thumbnailHigh: thumbnails.high?.url ?? undefined,
        subscriberCount: statistics.subscriberCount
          ? parseInt(statistics.subscriberCount, 10)
          : undefined,
        videoCount: statistics.videoCount
          ? parseInt(statistics.videoCount, 10)
          : undefined,
        viewCount: statistics.viewCount
          ? BigInt(statistics.viewCount)
          : undefined,
        hiddenSubscriberCount: statistics.hiddenSubscriberCount ?? false,
        uploadsPlaylistId:
          contentDetails?.relatedPlaylists?.uploads ?? undefined,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch channel details",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 선택한 채널 ID로 아티스트의 YouTube 채널 정보 업데이트
   * @param identifier - Artist ID(숫자) 또는 alias(문자열)
   * @param channelId - YouTube channel ID
   */
  async updateArtistChannel(artistId: number, channelId: string) {
    try {
      // 1. 아티스트 찾기 (ID만 허용)
      const artist = await this.prisma.artist.findUnique({
        where: { id: artistId },
      });

      if (!artist) {
        throw new HttpException("Artist not found", HttpStatus.NOT_FOUND);
      }

      // 2. 채널 상세 정보 가져오기 (서비스 메서드 사용)
      const channelData = await this.getChannelDetails(channelId);

      // 3. Artist 썸네일 업데이트
      await this.prisma.artist.update({
        where: { id: artist.id },
        data: {
          thumbnailDefault: channelData.thumbnailDefault,
          thumbnailMedium: channelData.thumbnailMedium,
          thumbnailHigh: channelData.thumbnailHigh,
        },
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

      return {
        artist: artist.name,
        channelId: channelData.channelId,
        channelTitle: channelData.title,
        subscriberCount: channelData.subscriberCount ?? undefined,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to update artist channel",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 채널의 재생목록들 가져오기 (모든 재생목록)
   */
  async getPlaylistsFromChannel(
    channelId: string,
    maxResults: number = 100,
  ): Promise<
    {
      playlistId: string;
      title: string;
      description: string;
      itemCount: number;
      publishedAt: string;
    }[]
  > {
    if (!this.API_KEY) {
      throw new HttpException(
        "YouTube API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const url = `${this.API_BASE_URL}/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=${maxResults}&key=${this.API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message || `YouTube API error: ${response.status}`;

        throw new HttpException(
          {
            statusCode: response.status,
            message: errorMessage,
            details: errorData,
          },
          response.status,
        );
      }

      const data = YoutubePlaylistResponseSchema.parse(await response.json());

      if (data.items.length === 0) {
        return [];
      }

      return data.items.map((item) => ({
        playlistId: item.id,
        title: item.snippet.title,
        description: item.snippet.description ?? "",
        itemCount: item.contentDetails.itemCount ?? 0,
        publishedAt: item.snippet.publishedAt,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch channel playlists",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 채널의 모든 동영상 가져오기 (uploads 재생목록 사용 - 쿼터 1)
   */
  async getVideosFromChannel(
    channelId: string,
    maxResults: number = 50,
  ): Promise<
    {
      videoId: string;
      title: string;
      description: string;
      publishedAt: string;
      thumbnailUrl?: string;
    }[]
  > {
    if (!this.API_KEY) {
      throw new HttpException(
        "YouTube API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      // 1. 채널 정보에서 uploads playlist ID 가져오기 (캐시된 경우 DB에서)
      const channelDetails = await this.getChannelDetails(channelId);

      if (!channelDetails.uploadsPlaylistId) {
        throw new HttpException(
          "Uploads playlist not found",
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. uploads playlist에서 동영상 가져오기 (playlistItems API - 쿼터 1)
      const playlistVideos = await this.getVideosFromPlaylist(
        channelDetails.uploadsPlaylistId,
        maxResults,
      );

      // 3. 형식 변환
      return playlistVideos.map((video) => ({
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        publishedAt: video.publishedAt,
        thumbnailUrl: undefined,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch channel videos",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 재생목록의 동영상들 가져오기
   */
  async getVideosFromPlaylist(
    playlistId: string,
    maxResults: number = 100,
  ): Promise<
    {
      videoId: string;
      title: string;
      description: string;
      publishedAt: string;
      channelId: string;
      channelTitle: string;
    }[]
  > {
    if (!this.API_KEY) {
      throw new HttpException(
        "YouTube API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const url = `${this.API_BASE_URL}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${this.API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message || `YouTube API error: ${response.status}`;

        throw new HttpException(
          {
            statusCode: response.status,
            message: errorMessage,
            details: errorData,
          },
          response.status,
        );
      }

      const data = YoutubePlaylistItemsResponseSchema.parse(
        await response.json(),
      );

      if (data.items.length === 0) {
        return [];
      }

      return data.items.map((item) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description ?? "",
        publishedAt: item.snippet.publishedAt,
        channelId:
          item.snippet.videoOwnerChannelId ??
          item.snippet.channelId ??
          "unknown",
        channelTitle:
          item.snippet.videoOwnerChannelTitle ??
          item.snippet.channelTitle ??
          "Unknown Channel",
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch playlist videos",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
