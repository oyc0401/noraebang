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
import { ApiResponse } from "../dto/api-response.dto";
import {
  SongDetailResponseDto,
  SongDto,
  SongListResponseDto,
} from "./dto/song-response.dto";
import { SongsService } from "./songs.service";

@ApiTags("Songs")
@Controller("songs")
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get("artist/:artistId")
  @ApiOperation({
    summary: "특정 아티스트의 곡 목록 조회",
    description: "아티스트 ID로 해당 아티스트의 곡 목록을 조회합니다.",
  })
  @ApiParam({ name: "artistId", description: "아티스트 ID" })
  @SwaggerApiResponse({
    status: 200,
    description: "곡 목록",
    type: SongListResponseDto,
  })
  async findByArtistId(
    @Param("artistId", ParseIntPipe) artistId: number,
  ): Promise<SongListResponseDto> {
    const songs = await this.songsService.findByArtistId(artistId);
    const mapped: SongDto[] = songs.map((song) => ({
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      artistIds: song.artistSongs.map((as) => as.artistId),
      role: song.artistSongs[0]?.role ?? null,
      karaokeSongs: song.karaokeSongs.map(({ provider, karaokeNo }) => ({
        provider,
        karaokeNo,
      })),
    }));

    return ApiResponse.success(mapped);
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
    type: SongDetailResponseDto,
  })
  @SwaggerApiResponse({ status: 404, description: "곡을 찾을 수 없음" })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<SongDetailResponseDto> {
    const song = await this.songsService.findById(id);
    if (!song) {
      throw new NotFoundException("Song not found");
    }

    const mapped: SongDto = {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      artistIds: song.artistSongs.map((as) => as.artistId),
      role: song.artistSongs[0]?.role ?? null,
      karaokeSongs: song.karaokeSongs.map(({ provider, karaokeNo }) => ({
        provider,
        karaokeNo,
      })),
    };

    return ApiResponse.success(mapped);
  }
}
