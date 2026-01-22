import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty({ example: 900, description: "Access token 만료 시간 (초)" })
  expiresIn: number;

  @ApiProperty({ example: true, description: "쿠키 설정 성공 여부" })
  success: boolean;

}
