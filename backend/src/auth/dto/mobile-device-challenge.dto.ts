import { ApiProperty } from "@nestjs/swagger";

export class MobileDeviceChallengeDto {
  @ApiProperty({
    description: "기기 고유 ID",
    example: "device-1234-5678",
  })
  deviceId: string;
}
