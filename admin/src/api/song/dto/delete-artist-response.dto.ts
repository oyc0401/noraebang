import { ApiProperty } from "@nestjs/swagger";

export class DeleteArtistResponseDto {
  @ApiProperty({ description: "삭제된 artist.id", example: 140 })
  deletedArtistId: number;

  @ApiProperty({ description: "함께 삭제된 곡 수", example: 12 })
  deletedSongCount: number;
}
