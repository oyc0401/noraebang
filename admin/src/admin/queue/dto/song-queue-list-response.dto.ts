import { ApiProperty } from "@nestjs/swagger";
import { SongQueueItemDto } from "./song-queue-item.dto";

export class SongQueueListResponseDto {
  @ApiProperty({ type: [SongQueueItemDto] })
  data: SongQueueItemDto[];
}