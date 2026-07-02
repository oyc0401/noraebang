import { ApiProperty } from "@nestjs/swagger";

export class DeleteSongCreationQueueResponseDto {
  @ApiProperty({ description: "삭제된 song_creation_queue.id", example: 1 })
  deletedId: number;
}
