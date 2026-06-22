import { ApiProperty } from "@nestjs/swagger";

export class ConnectSongArtistQueueArtistResponseDto {
  @ApiProperty({ example: 1 })
  queueId: number;

  @ApiProperty({ example: 10 })
  artistId: number;

  @ApiProperty({ example: "宇多田ヒカル" })
  artistName: string;
}
