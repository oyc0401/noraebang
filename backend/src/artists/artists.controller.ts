import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import {
  ARTIST_ALIAS_GROUPS,
  getArtistAliases,
} from "../config/artist-aliases";
import { ApiResponse } from "../dto/api-response.dto";
import { YoutubeChannelUpdateDto } from "../youtube/dto/youtube-channel-update.dto";
import { YoutubeService } from "../youtube/youtube.service";
import {
  ARTIST_SORT_OPTIONS,
  ArtistSortOption,
  ArtistsService,
  DEFAULT_ARTIST_SORT,
} from "./artists.service";
import {
  ArtistDetailResponseDto,
  ArtistDetailsListResponseDto,
  ArtistListResponseDto,
  YoutubeChannelUpdateResponseDto,
} from "./dto/artist-response.dto";

const isArtistSortOption = (value?: string): value is ArtistSortOption =>
  !!value && ARTIST_SORT_OPTIONS.includes(value as ArtistSortOption);

@ApiTags("Artists")
@Controller("artists")
export class ArtistsController {
  constructor(
    private readonly artistsService: ArtistsService,
    private readonly youtubeService: YoutubeService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "아티스트 목록 조회",
    description: "전체 아티스트를 반환합니다.",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: ARTIST_SORT_OPTIONS,
    description:
      "정렬 기준 (id_desc, name_asc, name_desc, subscriber_desc, subscriber_asc, song_count_asc, song_count_desc)",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "아티스트 목록",
    type: ArtistListResponseDto,
  })
  async findAll(@Query("sort") sort?: string): Promise<ArtistListResponseDto> {
    const sortOption = isArtistSortOption(sort) ? sort : DEFAULT_ARTIST_SORT;
    const artists = await this.artistsService.findAll(sortOption);
    return ApiResponse.success(artists);
  }

  @Get("details")
  @ApiOperation({
    summary: "아티스트 목록 조회 (상세 정보 포함)",
    description:
      "전체 아티스트를 YouTube 채널, 썸네일 등 상세 정보와 함께 반환합니다. 구독자 수 기준으로 정렬됩니다.",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "아티스트 목록 (상세 정보 포함)",
    type: ArtistDetailsListResponseDto,
  })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: ARTIST_SORT_OPTIONS,
    description:
      "정렬 기준 (id_desc, name_asc, name_desc, subscriber_desc, subscriber_asc, song_count_asc, song_count_desc)",
  })
  async findAllDetails(
    @Query("sort") sort?: string,
  ): Promise<ArtistDetailsListResponseDto> {
    const sortOption = isArtistSortOption(sort) ? sort : DEFAULT_ARTIST_SORT;
    const artists = await this.artistsService.findAllDetails(sortOption);

    // 응답 포맷: 구독자 수와 미디엄 썸네일 포함
    const formatted = artists.map((artist) => {
      let aliasGroup: { groupId: string; aliases: string[] } | null = null;
      const aliasValue = artist.alias;
      if (aliasValue) {
        const aliases = getArtistAliases(aliasValue);
        if (aliases.length > 1) {
          const group = ARTIST_ALIAS_GROUPS.find((item) =>
            item.aliases.includes(aliasValue),
          );
          if (group) {
            aliasGroup = {
              groupId: group.groupId,
              aliases,
            };
          }
        }
      }

      return {
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        alias: artist.alias,
        thumbnailDefault: artist.thumbnailDefault,
        thumbnailMedium: artist.thumbnailMedium,
        thumbnailHigh: artist.thumbnailHigh,
        songCount: artist._count.artistSongs,
        aliasGroup,
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
      };
    });

    return ApiResponse.success(formatted);
  }

  @Get(":identifier")
  @ApiOperation({
    summary: "아티스트 상세 조회 (ID 또는 alias)",
    description:
      "숫자는 ID로, 문자열은 alias 로 판단하여 해당 아티스트 정보를 반환합니다.",
  })
  @ApiParam({
    name: "identifier",
    description: "아티스트 ID 또는 alias",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "아티스트 상세 정보",
    type: ArtistDetailResponseDto,
  })
  @SwaggerApiResponse({ status: 404, description: "아티스트를 찾을 수 없음" })
  async findByIdOrAlias(
    @Param("identifier") identifier: string,
  ): Promise<ArtistDetailResponseDto> {
    const artist = await this.artistsService.findByIdOrAlias(identifier);
    if (!artist) {
      throw new NotFoundException("Artist not found");
    }
    return ApiResponse.success(artist);
  }

  @Post(":alias/youtube-channel")
  @ApiOperation({
    summary: "아티스트 YouTube 채널 정보 업데이트",
    description:
      "선택한 아티스트에 YouTube 채널 ID 또는 @handle 을 연결합니다.",
  })
  @ApiParam({ name: "alias", description: "아티스트 alias" })
  @SwaggerApiResponse({
    status: 200,
    description: "업데이트 성공",
    type: YoutubeChannelUpdateResponseDto,
  })
  @SwaggerApiResponse({ status: 400, description: "channelId 필요" })
  async updateYoutubeChannel(
    @Param("alias") alias: string,
    @Body() body: YoutubeChannelUpdateDto,
  ): Promise<YoutubeChannelUpdateResponseDto> {
    const data = await this.youtubeService.updateArtistChannel(
      alias,
      body.channelId,
    );
    return ApiResponse.success(data, "YouTube channel updated successfully");
  }
}
