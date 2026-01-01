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
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Song } from "@prisma/client";
import { ApiResponse } from "../common/dto/api-response.dto";
import { SongsService } from "./songs.service";

@ApiTags("Songs")
@Controller("songs")
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  @ApiOperation({
    summary: "곡 목록 조회 (검색 및 필터링)",
    description:
      "검색어(q) 또는 artistId를 이용해 곡을 조회합니다. 둘 다 없으면 전체 곡을 반환합니다.",
  })
  @ApiQuery({
    name: "q",
    required: false,
    description: "검색어 (제목으로 검색)",
  })
  @ApiQuery({
    name: "artistId",
    required: false,
    description: "아티스트 ID로 필터링",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "곡 목록",
    schema: {
      example: {
        data: [
          {
            id: 101,
            title: "夜に駆ける",
            titleKo: "밤을 달리다",
            karaokeSongs: [
              { provider: "TJ", karaokeNo: "12345" },
              { provider: "KY", karaokeNo: "67890" },
            ],
          },
        ],
        message: null,
      },
    },
  })
  async findAll(
    @Query("q") query?: string,
    @Query("artistId") artistId?: string,
  ) {
    let songs: Song[];

    if (artistId && query) {
      // Both artistId and query: filter by artist first, then search within
      const artistSongs = await this.songsService.findByArtistId(
        Number(artistId),
      );
      const lowerQuery = query.toLowerCase();
      songs = artistSongs.filter(
        (song) =>
          song.title.toLowerCase().includes(lowerQuery) ||
          song.titleKo?.toLowerCase().includes(lowerQuery),
      );
    } else if (artistId) {
      songs = await this.songsService.findByArtistId(Number(artistId));
    } else if (query) {
      songs = await this.songsService.searchByTitle(query);
    } else {
      songs = await this.songsService.findAll();
    }

    return ApiResponse.success(songs);
  }

  @Get(":id")
  @ApiOperation({
    summary: "곡 상세 조회",
    description: "곡 ID로 단일 곡 상세 정보를 조회합니다.",
  })
  @ApiParam({ name: "id", description: "곡 ID" })
  @SwaggerApiResponse({
    status: 200,
    description: "곡 상세 정보",
    schema: {
      example: {
        data: {
          id: 101,
          title: "夜に駆ける",
          titleKo: "밤을 달리다",
          karaokeSongs: [{ provider: "TJ", karaokeNo: "12345" }],
        },
        message: null,
      },
    },
  })
  @SwaggerApiResponse({ status: 404, description: "곡을 찾을 수 없음" })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const song = await this.songsService.findById(id);
    if (!song) {
      throw new NotFoundException("Song not found");
    }
    return ApiResponse.success(song);
  }
}
