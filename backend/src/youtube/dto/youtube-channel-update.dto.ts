import { ApiProperty } from "@nestjs/swagger";

export class YoutubeChannelUpdateDto {
  @ApiProperty({
    description: "YouTube 채널 ID 또는 @handle",
    example: "UCvpredjG93ifbCP1Y77JyFA",
  })
  channelId!: string;
}
