import {
  BadRequestException,
  Body,
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
import { YoutubeChannelUpdateDto } from "./dto/youtube-channel-update.dto";

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

  @Post("update-artist-channel/:alias")
  @ApiOperation({
    summary: "아티스트 YouTube 채널 정보 업데이트",
    description:
      "선택한 아티스트에 YouTube 채널 ID 또는 @handle 을 연결합니다.",
  })
  @ApiParam({ name: "alias", description: "아티스트 alias" })
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
    @Body() body: YoutubeChannelUpdateDto,
  ) {
    const data = await this.youtubeService.updateArtistChannel(
      alias,
      body.channelId,
    );
    return ApiResponse.success(data, "YouTube channel updated successfully");
  }
}
