import { ApiProperty } from "@nestjs/swagger";

export class DeleteArtistCreationQueueResponseDto {
  @ApiProperty({ description: "artist_creation_queue.id: 삭제된 큐 항목 ID", example: 1 })
  deletedId: number;
}
