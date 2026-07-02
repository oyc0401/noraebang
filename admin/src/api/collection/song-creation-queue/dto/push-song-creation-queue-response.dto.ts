import { ApiProperty } from "@nestjs/swagger";

export class PushSongCreationQueueResponseDto {
  @ApiProperty({ example: 3 })
  requested: number;

  @ApiProperty({ example: 2 })
  pushed: number;

  @ApiProperty({ description: "TJ곡이 없거나 아티스트 미매칭으로 건너뛴 수", example: 1 })
  skipped: number;
}
