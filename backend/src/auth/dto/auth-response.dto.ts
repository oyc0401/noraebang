import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty({ example: 900, description: "Access token 만료 시간 (초)" })
  expiresIn: number;

  @ApiProperty({ example: true, description: "쿠키 설정 성공 여부" })
  success: boolean;

  @ApiPropertyOptional({
    description: "모바일 클라이언트 요청 시 본문으로 반환되는 Access Token",
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: "모바일 클라이언트 요청 시 본문으로 반환되는 Refresh Token",
  })
  refreshToken?: string;
}
