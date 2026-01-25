import { ApiProperty } from "@nestjs/swagger";
import { SongDto } from "./song.dto";
import { SpotifyInfoDto } from "./spotify.dto";
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

  @ApiProperty({ type: SpotifyInfoDto, required: false })
  spotify?: SpotifyInfoDto;
}

export class ArtistDetailsDto extends ArtistDto {
  @ApiProperty({ type: [SongDto], required: false, description: "아티스트의 곡 목록" })
  songs?: SongDto[];
}
