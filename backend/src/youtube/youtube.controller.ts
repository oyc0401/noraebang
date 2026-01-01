import { Body, Controller, Param, Post } from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { ApiResponse } from "../common/dto/api-response.dto";
import { YoutubeChannelUpdateDto } from "./dto/youtube-channel-update.dto";
import { YoutubeService } from "./youtube.service";

@ApiTags("YouTube")
@Controller("youtube")
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

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
