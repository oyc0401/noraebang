import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { MediaListQueryDto } from "./dto/media-list-query.dto";
import {
  SpotifyArtistUpdateResultDto,
  YoutubeChannelUpdateResultDto,
  YoutubeVideoStatsRefreshResultDto,
} from "./dto/media-update-result.dto";
import { SpotifyArtistListResponseDto } from "./dto/spotify-artist-list-response.dto";
import { YoutubeChannelListResponseDto } from "./dto/youtube-channel-list-response.dto";
import { MediaService } from "./media.service";

@ApiTags("media")
@Controller("api/media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get("youtube-channels")
  @ApiOkResponse({
    description: "media DB 유튜브 채널 목록",
    type: YoutubeChannelListResponseDto,
  })
  findYoutubeChannels(
    @Query() query: MediaListQueryDto,
  ): Promise<YoutubeChannelListResponseDto> {
    return this.mediaService.findYoutubeChannels(query);
  }

  @Post("youtube-channels/:id/update")
  @ApiOkResponse({
    description: "채널 정보 갱신 + 신규 영상 증분 수집",
    type: YoutubeChannelUpdateResultDto,
  })
  updateYoutubeChannel(
    @Param("id") id: string,
  ): Promise<YoutubeChannelUpdateResultDto> {
    return this.mediaService.updateYoutubeChannel(id);
  }

  @Post("youtube-channels/:id/refresh-video-stats")
  @ApiOkResponse({
    description: "저장된 전체 영상의 조회수/좋아요 통계 갱신",
    type: YoutubeVideoStatsRefreshResultDto,
  })
  refreshYoutubeVideoStats(
    @Param("id") id: string,
  ): Promise<YoutubeVideoStatsRefreshResultDto> {
    return this.mediaService.refreshYoutubeVideoStats(id);
  }

  @Get("spotify-artists")
  @ApiOkResponse({
    description: "media DB 스포티파이 아티스트 목록",
    type: SpotifyArtistListResponseDto,
  })
  findSpotifyArtists(
    @Query() query: MediaListQueryDto,
  ): Promise<SpotifyArtistListResponseDto> {
    return this.mediaService.findSpotifyArtists(query);
  }

  @Post("spotify-artists/:id/update")
  @ApiOkResponse({
    description: "아티스트 정보 갱신 + 신규 트랙 수집",
    type: SpotifyArtistUpdateResultDto,
  })
  updateSpotifyArtist(
    @Param("id") id: string,
  ): Promise<SpotifyArtistUpdateResultDto> {
    return this.mediaService.updateSpotifyArtist(id);
  }
}
