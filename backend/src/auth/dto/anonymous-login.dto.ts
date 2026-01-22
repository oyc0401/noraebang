import { ApiProperty } from "@nestjs/swagger";

export class AnonymousLoginDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "기기 고유 ID (UUID v4). 없으면 서버에서 새로 생성",
    required: false,
  })
  deviceId?: string;
}
