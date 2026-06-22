import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ConnectSongArtistQueueArtistRequestDto } from "./dto/connect-song-artist-queue-artist-request.dto";
import { ConnectSongArtistQueueArtistResponseDto } from "./dto/connect-song-artist-queue-artist-response.dto";
import { PushSongArtistQueueRequestDto } from "./dto/push-song-artist-queue-request.dto";
import { PushSongArtistQueueResponseDto } from "./dto/push-song-artist-queue-response.dto";
import { SongArtistQueueListQueryDto } from "./dto/song-artist-queue-list-query.dto";
import { SongArtistQueueListResponseDto } from "./dto/song-artist-queue-list-response.dto";
import { SongArtistQueueService } from "./song-artist-queue.service";

@ApiTags("song-artist-queue")
@Controller("api/song-artist-queue")
export class SongArtistQueueController {
  constructor(
    private readonly songArtistQueueService: SongArtistQueueService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: "List song-artist queue items",
    type: SongArtistQueueListResponseDto,
  })
  findAll(
    @Query() query: SongArtistQueueListQueryDto,
  ): Promise<SongArtistQueueListResponseDto> {
    return this.songArtistQueueService.findAll(query);
  }

  @Post("push")
  @ApiOkResponse({
    description: "Push TJ song items into the song-artist queue",
    type: PushSongArtistQueueResponseDto,
  })
  push(
    @Body() body: PushSongArtistQueueRequestDto | undefined,
  ): Promise<PushSongArtistQueueResponseDto> {
    return this.songArtistQueueService.pushItems(body?.items);
  }

  @Post(":id/connect-artist")
  @ApiOkResponse({
    description: "Connect a song-artist queue item to an existing artist",
    type: ConnectSongArtistQueueArtistResponseDto,
  })
  connectArtist(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConnectSongArtistQueueArtistRequestDto | undefined,
  ): Promise<ConnectSongArtistQueueArtistResponseDto> {
    return this.songArtistQueueService.connectArtist(id, body?.artistName);
  }
}
