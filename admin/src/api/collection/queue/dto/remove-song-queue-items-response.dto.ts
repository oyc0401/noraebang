import { ApiProperty } from "@nestjs/swagger";

export class RemoveSongQueueItemsResponseDto {
  @ApiProperty({ example: 2 })
  deletedCount: number;
}
