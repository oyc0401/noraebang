import { ApiPropertyOptional } from "@nestjs/swagger";

export class MobileAnonymousLoginDto {
  @ApiPropertyOptional({
    description: "선택적 기기 고유 ID (통계용)",
    example: "device-1234-5678",
  })
  deviceId?: string;
}
