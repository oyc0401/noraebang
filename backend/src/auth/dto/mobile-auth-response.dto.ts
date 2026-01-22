import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MobileAuthResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIs..." })
  accessToken: string;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIs..." })
  refreshToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;

  @ApiPropertyOptional({
    description: "신규 기기에 한해 발급되는 deviceSecret",
    example: "f1d2d2f924e986ac86fdf7b36c94bcdf",
  })
  deviceSecret?: string;
}
