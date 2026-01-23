import { ApiProperty } from "@nestjs/swagger";

export class MobileAuthResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIs..." })
  accessToken: string;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIs..." })
  refreshToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;
}
