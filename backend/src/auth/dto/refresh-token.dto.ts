import { ApiPropertyOptional } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiPropertyOptional({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  refreshToken?: string;
}
