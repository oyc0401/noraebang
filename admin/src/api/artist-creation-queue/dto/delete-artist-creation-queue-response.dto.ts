import { ApiProperty } from "@nestjs/swagger";

export class DeleteArtistCreationQueueResponseDto {
  @ApiProperty({ example: 1 })
  deletedId: number;
}
