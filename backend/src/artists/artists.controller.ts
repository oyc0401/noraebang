import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { ArtistDetailsDto, ErrorResponseDto } from "../dto";
import { ApiResponse } from "../dto/api-response.dto";
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
} from "./dto/artist-response.dto";

const isArtistSortOption = (value?: string): value is ArtistSortOption =>
  !!value && ARTIST_SORT_OPTIONS.includes(value as ArtistSortOption);

@ApiTags("Artists")
@Controller("artists")
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  @ApiOperation({
    summary: "전체 아티스트 조회",
    description: "모든 아티스트 목록을 반환합니다.",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: ARTIST_SORT_OPTIONS,
    description:
      "정렬 기준 (id_desc, name_asc, name_desc, subscriber_desc, subscriber_asc, song_count_asc, song_count_desc)",
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
    description: "아티스트 목록",
    type: ArtistListResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async findAll(
    @Query("sort") sort?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ArtistListResponseDto> {
    const sortOption = isArtistSortOption(sort) ? sort : DEFAULT_ARTIST_SORT;
    const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNumber = limit ? Math.max(1, parseInt(limit, 10)) : 20;

    const { artists, total } = await this.artistsService.findAll(
      sortOption,
      pageNumber,
      limitNumber,
    );

    return ApiResponse.success(artists, "아티스트 목록 조회 성공", {
      total,
      page: pageNumber,
      limit: limitNumber,
      hasMore: pageNumber * limitNumber < total,
    });
  }

  @Get("details")
  @ApiOperation({
    summary: "전체 아티스트 상세 조회",
    description:
      "전체 아티스트를 YouTube 채널, 썸네일 등 상세 정보와 함께 반환합니다.",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "아티스트 목록 (상세 정보 포함)",
    type: ArtistDetailsListResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: ARTIST_SORT_OPTIONS,
    description:
      "정렬 기준 (id_desc, name_asc, name_desc, subscriber_desc, subscriber_asc, song_count_asc, song_count_desc)",
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
  async findAllDetails(
    @Query("sort") sort?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<ArtistDetailsListResponseDto> {
    const sortOption = isArtistSortOption(sort) ? sort : DEFAULT_ARTIST_SORT;
    const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNumber = limit ? Math.max(1, parseInt(limit, 10)) : 20;

    const { artists, total } = await this.artistsService.findAllDetails(
      sortOption,
      pageNumber,
      limitNumber,
    );

    return ApiResponse.success(artists, "아티스트 상세 목록 조회 성공", {
      total,
      page: pageNumber,
      limit: limitNumber,
      hasMore: pageNumber * limitNumber < total,
    });
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
  async findByIdOrAlias(
    @Param("identifier") identifier: string,
  ): Promise<ArtistDetailResponseDto> {
    const artist: ArtistDetailsDto | null =
      await this.artistsService.findByIdOrAlias(identifier);
    if (!artist) {
      throw new NotFoundException("Artist not found");
    }
    return ApiResponse.success(artist, "아티스트 정보 조회 성공");
  }
}
