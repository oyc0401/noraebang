import { ApiProperty } from "@nestjs/swagger";

export class ArtistDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({ example: "yoasobi", required: false })
  alias?: string | null;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/default.jpg",
    required: false,
  })
  thumbnailDefault?: string | null;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/medium.jpg",
    required: false,
  })
  thumbnailMedium?: string | null;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/high.jpg",
    required: false,
  })
  thumbnailHigh?: string | null;

  @ApiProperty({
    example: "UCvpredjG93ifbCP1Y77JyFA",
    required: false,
    description: "연결된 YouTube 채널 ID",
  })
  youtubeChannelId?: string | null;

  @ApiProperty({
    example: "https://www.tjmedia.com/tjsong/song_add.asp",
    required: false,
    description: "TJ 노래방 곡 추가 요청 URL",
  })
  tjSongRequestUrl?: string | null;
}

export class YoutubeInfoDto {
  @ApiProperty({ example: "UCvpredjG93ifbCP1Y77JyFA" })
  channelId: string;

  @ApiProperty({ example: "Ayase / YOASOBI", required: false })
  title?: string | null;

  @ApiProperty({ example: "YOASOBI 공식 채널", required: false })
  description?: string | null;

  @ApiProperty({ example: "@Ayase_YOASOBI", required: false })
  customUrl?: string | null;

  @ApiProperty({ example: 1000000, required: false })
  subscriberCount?: number | null;

  @ApiProperty({ example: 200, required: false })
  videoCount?: number | null;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/yoasobi-thumbnail.jpg",
    required: false,
  })
  thumbnail?: string | null;
}

export class ArtistAliasGroupDto {
  @ApiProperty({ example: "yoasobi" })
  groupId: string;

  @ApiProperty({ example: ["yoasobi", "아야세"], type: [String] })
  aliases: string[];
}

export class ArtistDatailsDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({ example: "yoasobi", required: false })
  alias?: string | null;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/default.jpg",
    required: false,
  })
  thumbnailDefault?: string | null;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/medium.jpg",
    required: false,
  })
  thumbnailMedium?: string | null;

  @ApiProperty({
    example: "https://yt3.googleusercontent.com/high.jpg",
    required: false,
  })
  thumbnailHigh?: string | null;

  @ApiProperty({ example: 25 })
  songCount: number;

  @ApiProperty({ type: ArtistAliasGroupDto, required: false })
  aliasGroup?: ArtistAliasGroupDto | null;

  @ApiProperty({ type: YoutubeInfoDto, required: false })
  youtube?: YoutubeInfoDto | null;
}

export class ArtistListResponseDto {
  @ApiProperty({ type: [ArtistDto] })
  data: ArtistDto[];

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}

export class ArtistDetailsListResponseDto {
  @ApiProperty({ type: [ArtistDatailsDto] })
  data: ArtistDatailsDto[];

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}

export class ArtistDetailResponseDto {
  @ApiProperty({ type: ArtistDto })
  data: ArtistDto;

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}

export class YoutubeChannelUpdateResponseDataDto {
  @ApiProperty({ example: "YOASOBI" })
  artist: string;

  @ApiProperty({ example: "UCvpredjG93ifbCP1Y77JyFA" })
  channelId: string;

  @ApiProperty({ example: "Ayase / YOASOBI" })
  channelTitle: string;

  @ApiProperty({ example: 1000000, required: false })
  subscriberCount?: number | null;
}

export class YoutubeChannelUpdateResponseDto {
  @ApiProperty({ type: YoutubeChannelUpdateResponseDataDto })
  data: YoutubeChannelUpdateResponseDataDto;

  @ApiProperty({
    example: "YouTube channel updated successfully",
    required: false,
  })
  message?: string;
}
