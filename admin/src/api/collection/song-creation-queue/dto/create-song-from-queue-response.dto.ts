import { ApiProperty } from "@nestjs/swagger";

export class CreateSongFromQueueResponseDto {
  @ApiProperty({ description: "생성된 song.id", example: 1 })
  songId: number;

  @ApiProperty({ description: "연결된 artist.id", example: 140 })
  artistId: number;
}
