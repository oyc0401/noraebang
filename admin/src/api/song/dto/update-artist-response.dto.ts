import { ApiProperty } from "@nestjs/swagger";

export class UpdateArtistResponseDto {
  @ApiProperty({ description: "수정된 artist.id", example: 140 })
  artistId: number;
}
