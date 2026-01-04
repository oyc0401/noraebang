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
import { SongsService } from "./songs.service";

@ApiTags("Songs")
@Controller("songs")
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get("artist/:artistId")
  @ApiOperation({
    summary: "특정 아티스트의 곡 조회",
    description: "아티스트 ID로 해당 아티스트의 곡 목록을 조회합니다.",
  })
  @ApiParam({ name: "artistId", description: "아티스트 ID" })
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
  async findByArtistId(
    @Param("artistId", ParseIntPipe) artistId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<SongListResponseDto> {
    const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNumber = limit ? Math.max(1, parseInt(limit, 10)) : 20;

    const { songs, total } = await this.songsService.findByArtistId(
      artistId,
      pageNumber,
      limitNumber,
    );

    return ApiResponse.success(songs, "아티스트 곡 목록 조회 성공", {
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
