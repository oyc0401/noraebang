import { ApiProperty } from "@nestjs/swagger";

export class OembedDataDto {
  @ApiProperty({ example: "YOASOBI - 夜に駆ける" })
  title: string;

  @ApiProperty({ example: "YOASOBI" })
  author_name: string;

  @ApiProperty({ example: "https://www.youtube.com/channel/UCxxxxxx" })
  author_url: string;

  @ApiProperty({ example: "video" })
  type: string;

  @ApiProperty({ example: 113, required: false })
  height?: number;

  @ApiProperty({ example: 200, required: false })
  width?: number;

  @ApiProperty({ example: "1.0" })
  version: string;

  @ApiProperty({ example: "YouTube" })
  provider_name: string;

  @ApiProperty({ example: "https://www.youtube.com/" })
  provider_url: string;

  @ApiProperty({ example: 360, required: false })
  thumbnail_height?: number;

  @ApiProperty({ example: 480, required: false })
  thumbnail_width?: number;

  @ApiProperty({
    example: "https://img.youtube.com/vi/xyz/default.jpg",
    required: false,
  })
  thumbnail_url?: string;

  @ApiProperty({ required: false })
  html?: string;
}
