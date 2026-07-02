import { ApiProperty } from "@nestjs/swagger";

export class PushSongUpdateQueueResponseDto {
  @ApiProperty({ example: 3 })
  requested: number;

  @ApiProperty({ example: 2 })
  pushed: number;

  @ApiProperty({
    description: "곡이 없거나 가수 미연결이거나 이미 큐에 있어 건너뛴 수",
    example: 1,
  })
  skipped: number;
}
