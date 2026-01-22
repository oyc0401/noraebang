import { ApiProperty } from "@nestjs/swagger";

export class ProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  deviceId?: string;

  @ApiProperty({ example: "user@example.com", required: false })
  email?: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z" })
  lastLoginAt: Date;
}
