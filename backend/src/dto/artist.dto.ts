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
  @ApiProperty({ example: "yoasobi" })
  groupId: string;

  @ApiProperty({ example: ["yoasobi", "아야세"], type: [String] })
  aliases: string[];
}

export class ArtistDetailsDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({ example: "yoasobi", required: false })
  alias?: string;

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
