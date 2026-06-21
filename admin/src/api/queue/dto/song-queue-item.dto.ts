import { ApiProperty } from "@nestjs/swagger";

export class SongQueueItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "12345" })
  tjNumber: string;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ required: false, example: "YOASOBI" })
  artist?: string;

  @ApiProperty({ required: false, example: "20240101" })
  publishdate?: string;

  @ApiProperty({ required: false, example: "J-POP" })
  catalog?: string;

  @ApiProperty()
  createdAt: Date;
}
