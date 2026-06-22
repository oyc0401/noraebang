import { ApiProperty } from "@nestjs/swagger";

export class PushSongArtistQueueResponseDto {
  @ApiProperty({ example: 2 })
  requested: number;

  @ApiProperty({ example: 2 })
  pushed: number;

  @ApiProperty({ example: 1 })
  matched: number;

  @ApiProperty({ example: 1 })
  unmatched: number;
}
