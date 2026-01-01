import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { ApiResponse } from "../dto/api-response.dto";
import { SongDto } from "../songs/dto/song-response.dto";
import { SongsService } from "../songs/songs.service";
import { YoutubeService } from "../youtube/youtube.service";
import { YoutubeSongSearchResponseDto } from "./dto/youtube-song-search-response.dto";

type SongWithRelations = Awaited<ReturnType<SongsService["findAll"]>>[number];

@ApiTags("Search")
@Controller("search")
export class SearchController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly songsService: SongsService,
  ) {}

  @Get("youtube-song")
  @ApiOperation({
    summary: "YouTube URL로 곡 정보 조회",
    description:
      "YouTube 링크에서 제목을 추출하고 가장 일치하는 곡 정보를 반환합니다.",
  })
  @ApiQuery({ name: "url", description: "YouTube 동영상 URL" })
  @SwaggerApiResponse({
    status: 200,
    description: "YouTube 정보와 매칭된 곡 데이터",
    type: YoutubeSongSearchResponseDto,
  })
  @SwaggerApiResponse({ status: 400, description: "URL 파라미터 필요" })
  async getSongByYoutubeUrl(
    @Query("url") url: string,
  ): Promise<YoutubeSongSearchResponseDto> {
    if (!url) {
      throw new BadRequestException("URL parameter is required");
    }

    const youtube = await this.youtubeService.getOembedData(url);
    const songs = await this.songsService.findAll();

    const normalizedTitle = youtube.title?.toLowerCase() ?? "";

    const matchedSong = songs.find((song) => {
      const songTitle = song.title.toLowerCase();
      const matchesTitle =
        songTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(songTitle);

      const titleKo = song.titleKo?.toLowerCase();
      const matchesTitleKo = titleKo
        ? normalizedTitle.includes(titleKo)
        : false;

      return matchesTitle || matchesTitleKo;
    });

    const song = matchedSong ? this.mapSongToDto(matchedSong) : null;

    return ApiResponse.success(song, youtube.title);
  }

  private mapSongToDto(song: SongWithRelations): SongDto {
    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      artistIds: song.artistSongs.map((as) => as.artistId),
      karaokeSongs: song.karaokeSongs.map(({ provider, karaokeNo }) => ({
        provider,
        karaokeNo,
      })),
    };
  }
}
