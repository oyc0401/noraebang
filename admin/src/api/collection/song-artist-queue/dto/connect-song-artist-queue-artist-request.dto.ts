import { ApiProperty } from "@nestjs/swagger";

export class ConnectSongArtistQueueArtistRequestDto {
  @ApiProperty({ example: "宇多田ヒカル" })
  artistName: string;
}
