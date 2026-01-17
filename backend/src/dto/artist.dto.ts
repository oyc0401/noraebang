import { ApiProperty } from "@nestjs/swagger";
import { YoutubeInfoDto } from "./youtube.dto";

export class ArtistDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({
    example: "yoasobi",
    required: false,
    description: "아티스트 슬러그",
  })
  slug?: string;

  @ApiProperty({
    example: "KPOP",
    required: false,
    description: "아티스트의 대표 카탈로그",
  })
  homeCatalog?: string;

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

  @ApiProperty({
    example: "아이유",
    required: false,
    description: "TJ에서 사용하는 아티스트 이름",
  })
  tjName?: string;
}

export class ArtistDetailsDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "tayori" })
  name: string;

  @ApiProperty({ example: "타요리" })
  nameKo: string;

  @ApiProperty({
    example: "tayori",
    required: false,
    description: "아티스트 슬러그",
  })
  slug?: string;

  @ApiProperty({
    example: "JPOP",
    required: false,
    description: "아티스트의 대표 카탈로그",
  })
  homeCatalog?: string;

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

  @ApiProperty({ example: 25 })
  songCount: number;

  @ApiProperty({
    example: "아이유",
    required: false,
    description: "TJ에서 사용하는 아티스트 이름",
  })
  tjName?: string;

  @ApiProperty({ type: YoutubeInfoDto, required: false })
  youtube?: YoutubeInfoDto;
}
