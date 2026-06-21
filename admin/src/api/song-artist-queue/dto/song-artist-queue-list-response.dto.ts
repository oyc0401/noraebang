import { ApiProperty } from "@nestjs/swagger";
import { SongArtistQueueItemDto } from "./song-artist-queue-item.dto";

export class SongArtistQueueListResponseDto {
  @ApiProperty({ type: [SongArtistQueueItemDto] })
  data: SongArtistQueueItemDto[];
}
