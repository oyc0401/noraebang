import { ApiProperty } from "@nestjs/swagger";
import { YoutubeInfoDto } from "./youtube.dto";

export class ArtistDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({ example: "yoasobi", required: false })
  alias?: string;

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
    example: "https://www.tjmedia.com/tjsong/song_add.asp",
    required: false,
    description: "TJ 노래방 곡 추가 요청 URL",
  })
  tjSongRequestUrl?: string;
}

export class ArtistAliasGroupDto {
  @ApiProperty({ example: "tayori-islet" })
  groupId: string;

  @ApiProperty({ example: ["tayori", "islet"], type: [String] })
  aliases: string[];
}

export class ArtistDetailsDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "tayori" })
  name: string;

  @ApiProperty({ example: "타요리" })
  nameKo: string;

  @ApiProperty({ example: "tayori", required: false })
  alias?: string;

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
    example: "https://www.tjmedia.com/tjsong/song_add.asp",
    required: false,
    description: "TJ 노래방 곡 추가 요청 URL",
  })
  tjSongRequestUrl?: string;

  @ApiProperty({ type: ArtistAliasGroupDto, required: false })
  aliasGroup?: ArtistAliasGroupDto;

  @ApiProperty({ type: YoutubeInfoDto, required: false })
  youtube?: YoutubeInfoDto;
}
