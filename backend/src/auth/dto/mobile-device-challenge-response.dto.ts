import { ApiProperty } from "@nestjs/swagger";

export class MobileDeviceChallengeResponseDto {
  @ApiProperty({
    description: "로그인에 사용할 1회용 nonce",
    example: "c4a1f9e8b7...",
  })
  nonce: string;

  @ApiProperty({
    description: "nonce 만료까지 남은 시간(초)",
    example: 120,
  })
  expiresIn: number;
}
