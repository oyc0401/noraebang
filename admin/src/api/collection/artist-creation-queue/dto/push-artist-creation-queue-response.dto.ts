import { ApiProperty } from "@nestjs/swagger";

export class PushArtistCreationQueueResponseDto {
  @ApiProperty({ example: 3 })
  requested: number;

  @ApiProperty({ example: 2 })
  pushed: number;

  @ApiProperty({ example: 1 })
  skipped: number;
}
