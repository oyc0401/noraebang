import { ApiProperty } from "@nestjs/swagger";

export class PushSongCreationQueueRequestDto {
  @ApiProperty({
    description: "tj_song.id 목록: 곡 생성 큐에 넣을 TJ 노래방 번호 목록",
    type: [String],
    example: ["28397"],
  })
  tjSongIds: string[];
}
