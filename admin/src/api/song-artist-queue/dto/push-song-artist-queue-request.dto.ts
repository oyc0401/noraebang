import { ApiProperty } from "@nestjs/swagger";

export class PushSongArtistQueueItemDto {
  @ApiProperty({ example: "12345" })
  tjSongId: string;

  @ApiProperty({ example: "YOASOBI", required: false })
  artist?: string;
}

export class PushSongArtistQueueRequestDto {
  @ApiProperty({ type: [PushSongArtistQueueItemDto] })
  items: PushSongArtistQueueItemDto[];
}
