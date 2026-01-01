import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { ApiResponse } from "../common/dto/api-response.dto";
import type { ArtistsService } from "./artists.service";

@Controller("artists")
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  async findAll(@Query("includeYoutube") includeYoutube?: string) {
    // includeYoutube=true인 경우 YouTube 정보 포함
    if (includeYoutube === "true") {
      const artists = await this.artistsService.findAllWithYoutube();

      // 응답 포맷: 구독자 수와 미디엄 썸네일 포함
      const formatted = artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        alias: artist.alias,
        youtube: artist.youtubeChannel
          ? {
              channelId: artist.youtubeChannel.channelId,
              title: artist.youtubeChannel.title,
              description: artist.youtubeChannel.description,
              customUrl: artist.youtubeChannel.customUrl,
              subscriberCount: artist.youtubeChannel.subscriberCount,
              videoCount: artist.youtubeChannel.videoCount,
              thumbnail:
                artist.youtubeChannel.thumbnailMedium ||
                artist.youtubeChannel.thumbnailDefault,
            }
          : null,
      }));

      return ApiResponse.success(formatted);
    }

    // 기본: YouTube 정보 없이 반환
    const artists = await this.artistsService.findAll();
    return ApiResponse.success(artists);
  }

  @Get(":identifier")
  async findByIdOrAlias(@Param("identifier") identifier: string) {
    const artist = await this.artistsService.findByIdOrAlias(identifier);
    if (!artist) {
      throw new NotFoundException("Artist not found");
    }
    return ApiResponse.success(artist);
  }
}
