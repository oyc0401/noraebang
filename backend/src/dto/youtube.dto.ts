import { ApiProperty } from "@nestjs/swagger";

export class YoutubeInfoDto {
  @ApiProperty({ example: "UCvpredjG93ifbCP1Y77JyFA" })
  channelId: string;

  @ApiProperty({ example: "Ayase / YOASOBI", required: false })
  title?: string;

  @ApiProperty({ example: "YOASOBI 공식 채널", required: false })
  description?: string;

  @ApiProperty({ example: "@Ayase_YOASOBI", required: false })
  customUrl?: string;

  @ApiProperty({ example: 1000000, required: false })
  subscriberCount?: number;

  @ApiProperty({ example: 200, required: false })
  videoCount?: number;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/default.jpg",
    required: false,
  })
  thumbnailDefault?: string;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/medium.jpg",
    required: false,
  })
  thumbnailMedium?: string;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/high.jpg",
    required: false,
  })
  thumbnailHigh?: string;
}
