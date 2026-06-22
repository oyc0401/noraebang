import { ApiProperty } from "@nestjs/swagger";

export class SongArtistQueueItemDto {
  @ApiProperty({ description: "song_artist_queue.id: 곡-가수 큐 항목 ID", example: 1 })
  id: number;

  @ApiProperty({ description: "tj_song.id: TJ 노래방 번호", example: "12345" })
  tjSongId: string;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ required: false, example: "YOASOBI" })
  artist?: string;

  @ApiProperty({ description: "artist.id: 매칭된 아티스트 ID", required: false, example: 7 })
  artistId?: number;

  @ApiProperty({ required: false, example: "YOASOBI" })
  artistName?: string;

  @ApiProperty()
  createdAt: Date;
}
