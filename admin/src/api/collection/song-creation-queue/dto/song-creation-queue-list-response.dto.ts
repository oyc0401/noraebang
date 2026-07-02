import { ApiProperty } from "@nestjs/swagger";
import { SongCreationQueueItemDto } from "./song-creation-queue-item.dto";

export class SongCreationQueueListResponseDto {
  @ApiProperty({ type: [SongCreationQueueItemDto] })
  data: SongCreationQueueItemDto[];
}
