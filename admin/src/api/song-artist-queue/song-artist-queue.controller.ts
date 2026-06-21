import { Controller, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SongArtistQueueService } from "./song-artist-queue.service";

@ApiTags("song-artist-queue")
@Controller("api/song-artist-queue")
export class SongArtistQueueController {
  constructor(
    private readonly songArtistQueueService: SongArtistQueueService,
  ) {}

  @Post("sync")
  @ApiOkResponse({
    description: "Sync JPOP song queue items into the song-artist queue",
  })
  sync(): ReturnType<SongArtistQueueService["syncSongArtistQueue"]> {
    return this.songArtistQueueService.syncSongArtistQueue();
  }
}
