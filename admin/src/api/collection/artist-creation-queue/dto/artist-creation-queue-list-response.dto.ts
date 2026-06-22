import { ApiProperty } from "@nestjs/swagger";
import { ArtistCreationQueueItemDto } from "./artist-creation-queue-item.dto";

export class ArtistCreationQueueListResponseDto {
  @ApiProperty({ type: [ArtistCreationQueueItemDto] })
  data: ArtistCreationQueueItemDto[];
}
