import { ApiProperty } from "@nestjs/swagger";

export class ConnectSongArtistQueueArtistResponseDto {
  @ApiProperty({ description: "song_artist_queue.id: 곡-가수 큐 항목 ID", example: 1 })
  queueId: number;

  @ApiProperty({ description: "artist.id: 연결된 아티스트 ID", example: 10 })
  artistId: number;

  @ApiProperty({ example: "宇多田ヒカル" })
  artistName: string;
}
