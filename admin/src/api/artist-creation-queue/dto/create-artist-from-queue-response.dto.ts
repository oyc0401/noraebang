import { ApiProperty } from "@nestjs/swagger";

export class CreateArtistFromQueueResponseDto {
  @ApiProperty({ example: 1 })
  artistId: number;
}
