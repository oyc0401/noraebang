import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ApiResponse } from "../common/dto/api-response.dto";
import { YoutubeService } from "./youtube.service";

@ApiTags("YouTube")
@Controller("youtube")
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get()
  @ApiOperation({ summary: "YouTube 동영상 OEmbed 데이터 조회" })
  @ApiQuery({ name: "url", description: "YouTube 동영상 URL" })
  @SwaggerApiResponse({
    status: 200,
    description: "OEmbed 데이터",
    schema: {
      example: {
        data: {
          title: "YOASOBI - 夜に駆ける",
          author_name: "YOASOBI",
          provider_name: "YouTube",
          thumbnail_url: "https://img.youtube.com/vi/xyz/default.jpg",
        },
      },
    },
  })
  @SwaggerApiResponse({ status: 400, description: "URL 파라미터 필요" })
  async getOembedData(@Query("url") url: string) {
    if (!url) {
      throw new BadRequestException("URL parameter is required");
    }

    const data = await this.youtubeService.getOembedData(url);
    return ApiResponse.success(data);
  }

  @Get("search-channels")
  @ApiOperation({ summary: "YouTube 채널 검색" })
  @ApiQuery({ name: "name", description: "아티스트 이름" })
  @SwaggerApiResponse({
    status: 200,
    description: "검색 결과",
    schema: {
      example: {
        data: [
          {
            channelId: "UCvpredjG93ifbCP1Y77JyFA",
            title: "Ayase / YOASOBI",
            subscriberCount: 1000000,
            thumbnail: "https://yt3.googleusercontent.com/yoasobi.jpg",
          },
        ],
      },
    },
  })
  @SwaggerApiResponse({ status: 400, description: "아티스트 이름 필요" })
  async searchChannels(@Query("name") name: string) {
    if (!name) {
      throw new BadRequestException("Artist name is required");
    }

    const data = await this.youtubeService.searchChannels(name);
    return ApiResponse.success(data);
  }

  @Post("update-artist-channel/:alias")
  @ApiOperation({ summary: "아티스트 YouTube 채널 정보 업데이트" })
  @ApiParam({ name: "alias", description: "아티스트 alias" })
  @ApiQuery({ name: "channelId", description: "YouTube 채널 ID" })
  @SwaggerApiResponse({
    status: 200,
    description: "업데이트 성공",
    schema: {
      example: {
        data: {
          channelId: "UCvpredjG93ifbCP1Y77JyFA",
          channelTitle: "Ayase / YOASOBI",
        },
        message: "YouTube channel updated successfully",
      },
    },
  })
  @SwaggerApiResponse({ status: 400, description: "channelId 필요" })
  async updateArtistChannel(
    @Param("alias") alias: string,
    @Query("channelId") channelId: string,
  ) {
    if (!channelId) {
      throw new BadRequestException("channelId is required");
    }

    const data = await this.youtubeService.updateArtistChannel(
      alias,
      channelId,
    );
    return ApiResponse.success(data, "YouTube channel updated successfully");
  }
}
