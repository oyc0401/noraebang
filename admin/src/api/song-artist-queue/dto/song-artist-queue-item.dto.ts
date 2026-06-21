import { ApiProperty } from "@nestjs/swagger";

export class SongArtistQueueItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "12345" })
  tjSongId: string;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ required: false, example: "YOASOBI" })
  artist?: string;

  @ApiProperty({ required: false, example: 7 })
  artistId?: number;

  @ApiProperty({ required: false, example: "YOASOBI" })
  artistName?: string;

  @ApiProperty()
  createdAt: Date;
}
