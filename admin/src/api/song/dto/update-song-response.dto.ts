import { ApiProperty } from "@nestjs/swagger";

export class UpdateSongResponseDto {
  @ApiProperty({ description: "수정된 song.id", example: 97574 })
  songId: number;
}
