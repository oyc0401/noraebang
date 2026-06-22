import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
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
    description: "곡-가수 큐 조회",
    type: SongArtistQueueListResponseDto,
  })
  findAll(
    @Query() query: SongArtistQueueListQueryDto,
  ): Promise<SongArtistQueueListResponseDto> {
    return this.songArtistQueueService.findAll(query);
  }

  @Post("push")
  @ApiBody({ type: PushSongArtistQueueRequestDto })
  @ApiOkResponse({
    description: "곡-가수큐에 노래 추가",
    type: PushSongArtistQueueResponseDto,
  })
  push(
    @Body() body: PushSongArtistQueueRequestDto | undefined,
  ): Promise<PushSongArtistQueueResponseDto> {
    return this.songArtistQueueService.pushItems(body?.items);
  }

  @Patch(":queueId/artist")
  @ApiParam({
    name: "queueId",
    description: "song_artist_queue.id: 곡-가수 큐 항목 ID",
    example: 1,
  })
  @ApiBody({ type: ConnectSongArtistQueueArtistRequestDto })
  @ApiOkResponse({
    description: "곡-가수큐 항목 하나를 기존 artist에 수동연결",
    type: ConnectSongArtistQueueArtistResponseDto,
  })
  connectArtist(
    @Param("queueId", ParseIntPipe) queueId: number,
    @Body() body: ConnectSongArtistQueueArtistRequestDto | undefined,
  ): Promise<ConnectSongArtistQueueArtistResponseDto> {
    return this.songArtistQueueService.connectArtist(queueId, body?.artistName);
  }
}
