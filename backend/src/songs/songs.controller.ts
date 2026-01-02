import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
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
  ): Promise<SongListResponseDto> {
    const songs = await this.songsService.findByArtistId(artistId);
    return ApiResponse.success(songs, "아티스트 곡 목록 조회 성공");
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
