import { ApiProperty } from "@nestjs/swagger";
import { SongUpdateQueueItemDto } from "./song-update-queue-item.dto";

export class SongUpdateQueueListResponseDto {
  @ApiProperty({ type: [SongUpdateQueueItemDto] })
  data: SongUpdateQueueItemDto[];
}
