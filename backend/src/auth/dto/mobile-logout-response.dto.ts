import { ApiProperty } from "@nestjs/swagger";

export class MobileLogoutResponseDto {
  @ApiProperty({ example: true, description: "로그아웃 처리 성공 여부" })
  success: boolean;
}
