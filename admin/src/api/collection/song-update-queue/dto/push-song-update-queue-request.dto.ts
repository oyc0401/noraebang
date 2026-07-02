import { ApiProperty } from "@nestjs/swagger";

export class PushSongUpdateQueueRequestDto {
  @ApiProperty({
    description: "song.id 목록: 업데이트 큐에 넣을 곡 ID 목록",
    type: [Number],
    example: [1],
  })
  songIds: number[];
}
