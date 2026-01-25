import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { ErrorResponseDto } from "../dto";
import { ApiResponse } from "../dto/api-response.dto";
import {
  SongDetailResponseDto,
  SongListResponseDto,
} from "./dto/song-response.dto";
import {
  DEFAULT_SONG_SORT,
  SONG_SORT_OPTIONS,
  SongSortOption,
  SongsService,
} from "./songs.service";

const isSongSortOption = (value?: string): value is SongSortOption =>
  !!value && SONG_SORT_OPTIONS.includes(value as SongSortOption);

@ApiTags("Songs")
@Controller("songs")
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  @ApiOperation({
    summary: "곡 목록 조회 (정렬 옵션)",
    description:
      "정렬 옵션에 따라 곡 목록을 조회합니다.\n" +
      "- recent: 최근에 나온 곡 (TJ 발매일자 최신순)\n" +
      "- popular: 인기있는 곡 (SearchClick 많은 순)\n" +
      "- tj_recommend: TJ 추천수 많은 순 (3개월 이내 SongPropose hit 순)",
  })
  @ApiQuery({
    name: "sort",
    required: false,
    enum: SONG_SORT_OPTIONS,
    description: "정렬 기준 (기본값: recent)",
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
    description: "곡 목록",
    type: SongListResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async findBySort(
    @Query("sort") sort?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<SongListResponseDto> {
    const sortOption = isSongSortOption(sort) ? sort : DEFAULT_SONG_SORT;
    const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNumber = limit ? Math.max(1, parseInt(limit, 10)) : 20;

    const { songs, total } = await this.songsService.findBySort(
      sortOption,
      pageNumber,
      limitNumber,
    );

    return ApiResponse.success(songs, "곡 목록 조회 성공", {
      total,
      page: pageNumber,
      limit: limitNumber,
      hasMore: pageNumber * limitNumber < total,
    });
  }

  @Get(":id")
  @ApiOperation({
    summary: "단일 곡 조회",
    description: "곡 ID로 단일 곡 상세 정보를 조회합니다.",
  })
  @ApiParam({ name: "id", description: "곡 ID" })
  @SwaggerApiResponse({
    status: 200,
    description: "곡 상세 정보",
    type: SongDetailResponseDto,
  })
  @SwaggerApiResponse({
    status: 404,
    description: "곡을 찾을 수 없음",
    type: ErrorResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<SongDetailResponseDto> {
    const song = await this.songsService.findById(id);
    if (!song) {
      throw new NotFoundException("Song not found");
    }

    return ApiResponse.success(song, "곡 상세 정보 조회 성공");
  }
}
