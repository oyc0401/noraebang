import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { ErrorResponseDto } from "../dto";
import { ApiResponse } from "../dto/api-response.dto";
import { SongsService } from "../songs/songs.service";
import { YoutubeService } from "../youtube/youtube.service";
import { YoutubeSongSearchResponseDto } from "./dto/youtube-song-search-response.dto";

@ApiTags("Search")
@Controller("search")
export class SearchController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly songsService: SongsService,
  ) {}

  @Get("youtube")
  @ApiOperation({
    summary: "유튜브 URL로 단일곡 검색",
    description:
      "YouTube 링크에서 제목을 추출하고 가장 일치하는 곡 정보를 반환합니다.",
  })
  @ApiQuery({ name: "url", description: "YouTube 동영상 URL" })
  @SwaggerApiResponse({
    status: 200,
    description: "YouTube 정보와 매칭된 곡 데이터",
    type: YoutubeSongSearchResponseDto,
  })
  @SwaggerApiResponse({
    status: 400,
    description: "URL 파라미터 필요",
    type: ErrorResponseDto,
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
  async getSongByYoutubeUrl(
    @Query("url") url: string,
  ): Promise<YoutubeSongSearchResponseDto> {
    if (!url) {
      throw new BadRequestException("URL parameter is required");
    }

    const youtube = await this.youtubeService.getOembedData(url);
    const songs = await this.songsService.findAll();

    const normalizedTitle = youtube.title?.toLowerCase() ?? "";
    console.log("[YouTube Search] oEmbed title:", youtube.title);
    console.log("[YouTube Search] normalized title:", normalizedTitle);

    const matchedSong = songs.find((song) => {
      const songTitle = song.title.toLowerCase();
      const matchesTitle =
        songTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(songTitle);

      const titleKo = song.titleKo?.toLowerCase();
      const matchesTitleKo = titleKo
        ? normalizedTitle.includes(titleKo)
        : false;
      if (matchesTitle || matchesTitleKo) {
        console.log(
          `[YouTube Search] matched song: #${song.id} ${song.title} (${song.titleKo ?? "-"})`,
        );
      }

      return matchesTitle || matchesTitleKo;
    });

    if (!matchedSong) {
      throw new NotFoundException(
        `No song found matching YouTube title: ${youtube.title}`,
      );
    }

    return ApiResponse.success(matchedSong, youtube.title);
  }
}
