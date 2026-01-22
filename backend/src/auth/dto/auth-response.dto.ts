import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken: string;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  refreshToken: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  deviceId: string;

  @ApiProperty({ example: 900, description: "Access token 만료 시간 (초)" })
  expiresIn: number;
}
