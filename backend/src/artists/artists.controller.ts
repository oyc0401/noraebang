import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import {
  CurrentUser,
  type CurrentUserData,
} from "../auth/decorators/current-user.decorator";
import { OptionalJwtAuthGuard } from "../auth/guards";
import { ArtistDetailsDto, ErrorResponseDto } from "../dto";
import { ApiResponse } from "../dto/api-response.dto";
import { SearchService } from "../search/search.service";
import { ArtistsService } from "./artists.service";
import {
  ArtistDetailResponseDto,
  ArtistListResponseDto,
} from "./dto/artist-response.dto";

@ApiTags("Artists")
@Controller("artists")
export class ArtistsController {
  constructor(
    private readonly artistsService: ArtistsService,
    private readonly searchService: SearchService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "가장 많이 시청한 아티스트 조회",
    description:
      "SearchClick 기반으로 가장 많이 클릭된 아티스트 목록을 반환합니다. (YouTube, Spotify 정보 포함)",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "페이지 번호 (기본값: 1)",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "페이지당 항목 수 (기본값: 20)",
    example: 20,
  })
  @SwaggerApiResponse({
    status: 200,
    description: "가장 많이 시청한 아티스트 목록",
    type: ArtistListResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async findMostViewed(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ArtistListResponseDto> {
    const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNumber = limit ? Math.max(1, parseInt(limit, 10)) : 20;

    const { artists, total } = await this.artistsService.findMostViewed(
      pageNumber,
      limitNumber,
    );

    return ApiResponse.success(artists, "가장 많이 시청한 아티스트 목록 조회 성공", {
      total,
      page: pageNumber,
      limit: limitNumber,
      hasMore: pageNumber * limitNumber < total,
    });
  }

  @Get(":slug")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: "아티스트 상세 조회 (slug)",
    description: "slug 로 아티스트 상세 정보를 조회합니다.",
  })
  @ApiParam({
    name: "slug",
    description: "아티스트 slug",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "아티스트 상세 정보",
    type: ArtistDetailResponseDto,
  })
  @SwaggerApiResponse({
    status: 404,
    description: "아티스트를 찾을 수 없음",
    type: ErrorResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async findBySlug(
    @Param("slug") slug: string,
    @CurrentUser() user?: CurrentUserData,
  ): Promise<ArtistDetailResponseDto> {
    const artist: ArtistDetailsDto | null =
      await this.artistsService.findBySlug(slug);
    if (!artist) {
      throw new NotFoundException("Artist not found");
    }

    // 로그인 유저일 때 SearchClick 기록
    if (user?.id) {
      this.searchService
        .saveSearchClick(user.id, undefined, undefined, artist.id, undefined, "artist_page")
        .catch(() => {});
    }

    return ApiResponse.success(artist, "아티스트 정보 조회 성공");
  }
}
