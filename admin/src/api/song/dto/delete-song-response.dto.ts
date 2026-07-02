import { ApiProperty } from "@nestjs/swagger";

export class DeleteSongResponseDto {
  @ApiProperty({ description: "삭제된 song.id", example: 97574 })
  deletedId: number;
}
