import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { ArtistListQueryDto } from "./dto/artist-list-query.dto";
import { ArtistListResponseDto } from "./dto/artist-list-response.dto";
import { ArtistSongsQueryDto } from "./dto/artist-songs-query.dto";
import { ArtistSongsResponseDto } from "./dto/artist-songs-response.dto";
import { DeleteSongResponseDto } from "./dto/delete-song-response.dto";
import { UpdateSongRequestDto } from "./dto/update-song-request.dto";
import { UpdateSongResponseDto } from "./dto/update-song-response.dto";
import { SongService } from "./song.service";

@ApiTags("song")
@Controller("api/song")
export class SongController {
  constructor(private readonly songService: SongService) {}

  @Get("artists")
  @ApiOkResponse({
    description: "아티스트 목록 조회 (곡 수 포함, 검색/정렬/페이지네이션)",
    type: ArtistListResponseDto,
  })
  findArtists(
    @Query() query: ArtistListQueryDto,
  ): Promise<ArtistListResponseDto> {
    return this.songService.findArtists(query);
  }

  @Get("artists/:artistId/songs")
  @ApiParam({
    name: "artistId",
    description: "artist.id: 아티스트 ID",
    example: 140,
  })
  @ApiOkResponse({
    description:
      "아티스트의 곡 목록 조회 (유튜브/스포티파이 표시 정보는 media db에서 함께 조회)",
    type: ArtistSongsResponseDto,
  })
  findArtistSongs(
    @Param("artistId", ParseIntPipe) artistId: number,
    @Query() query: ArtistSongsQueryDto,
  ): Promise<ArtistSongsResponseDto> {
    return this.songService.findArtistSongs(artistId, query);
  }

  @Patch(":songId")
  @ApiParam({
    name: "songId",
    description: "song.id: 수정할 곡 ID",
    example: 97574,
  })
  @ApiBody({ type: UpdateSongRequestDto })
  @ApiOkResponse({
    description:
      "곡 수정. 포함된 필드만 반영하며 youtubeVideoIds/spotifyTrackIds는 전체 교체된다.",
    type: UpdateSongResponseDto,
  })
  updateSong(
    @Param("songId", ParseIntPipe) songId: number,
    @Body() body: UpdateSongRequestDto | undefined,
  ): Promise<UpdateSongResponseDto> {
    return this.songService.updateSong(songId, body);
  }

  @Delete(":songId")
  @ApiParam({
    name: "songId",
    description: "song.id: 삭제할 곡 ID",
    example: 97574,
  })
  @ApiOkResponse({
    description: "곡 삭제 (아티스트/유튜브/스포티파이 연결도 함께 삭제)",
    type: DeleteSongResponseDto,
  })
  deleteSong(
    @Param("songId", ParseIntPipe) songId: number,
  ): Promise<DeleteSongResponseDto> {
    return this.songService.deleteSong(songId);
  }
}
