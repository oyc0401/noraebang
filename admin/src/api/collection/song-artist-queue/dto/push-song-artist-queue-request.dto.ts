import { ApiProperty } from "@nestjs/swagger";

export class PushSongArtistQueueItemDto {
  @ApiProperty({ description: "tj_song.id: TJ 노래방 번호", example: "12345" })
  tjSongId: string;

  @ApiProperty({ example: "YOASOBI", required: false })
  artist?: string;
}

export class PushSongArtistQueueRequestDto {
  @ApiProperty({ type: [PushSongArtistQueueItemDto] })
  items: PushSongArtistQueueItemDto[];
}
