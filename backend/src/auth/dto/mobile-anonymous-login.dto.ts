import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MobileAnonymousLoginDto {
  @ApiProperty({
    description: "기기 고유 ID",
    example: "device-1234-5678",
  })
  deviceId: string;

  @ApiProperty({
    description: "서버에서 발급받은 1회용 nonce",
    example: "c4a1f9e8b7...",
  })
  nonce: string;

  @ApiPropertyOptional({
    description:
      "HMAC-SHA256(deviceSecret, nonce)의 16진수 문자열. 기존 기기는 필수",
    example: "4f2ab0a5c9c0f92c17b6adc65fa8b8b1f0d9e3d2f98a2b3c4d5e6f7a8b9c0d1e",
  })
  signature?: string;
}
