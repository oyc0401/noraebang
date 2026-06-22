import { ApiProperty } from "@nestjs/swagger";

export class CreateArtistFromQueueResponseDto {
  @ApiProperty({ description: "artist.id: 생성된 아티스트 ID", example: 1 })
  artistId: number;
}
