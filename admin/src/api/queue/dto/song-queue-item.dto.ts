import { ApiProperty } from "@nestjs/swagger";

export class SongQueueItemDto {
  @ApiProperty({ description: "song_queue.id: 신곡 큐 항목 ID", example: 1 })
  id: number;

  @ApiProperty({ description: "tj_song.id: TJ 노래방 번호", example: "12345" })
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
