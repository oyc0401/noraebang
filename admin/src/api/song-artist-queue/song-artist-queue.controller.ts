import { Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
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

  @Post("sync")
  @ApiOkResponse({
    description: "Sync JPOP song queue items into the song-artist queue",
  })
  sync(): ReturnType<SongArtistQueueService["syncSongArtistQueue"]> {
    return this.songArtistQueueService.syncSongArtistQueue();
  }
}
