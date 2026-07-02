import { ApiProperty } from "@nestjs/swagger";

export class DeleteSongUpdateQueueResponseDto {
  @ApiProperty({ description: "삭제된 큐 항목 ID", example: 1 })
  deletedId: number;
}
