import { ApiProperty } from "@nestjs/swagger";

export class ApplySongUpdateResponseDto {
  @ApiProperty({ description: "업데이트된 곡 ID", example: 1 })
  songId: number;
}
