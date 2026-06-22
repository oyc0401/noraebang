import { ApiProperty } from "@nestjs/swagger";

export class RemoveSongQueueItemsRequestDto {
  @ApiProperty({
    description: "tj_song.id 목록: TJ 노래방 번호 목록",
    example: ["12345", "67890"],
    type: [String],
  })
  tjNumbers: string[];
}
