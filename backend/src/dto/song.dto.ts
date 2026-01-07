import { ApiProperty } from "@nestjs/swagger";

export class KaraokeSongDto {
  @ApiProperty({ example: "TJ" })
  provider: string;

  @ApiProperty({ example: "12345" })
  karaokeNo: string;

  @ApiProperty({ example: "밤편지", required: false, nullable: true })
  title?: string | null;

  @ApiProperty({ example: "아이유", required: false, nullable: true })
  artist?: string | null;
}

export class ArtistSongDto {
  @ApiProperty({ example: 1 })
  artistId: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({
    example: "MAIN",
    required: false,
    enum: ["MAIN", "FEATURING", "PRODUCER"],
  })
  role?: string;

  @ApiProperty({
    example: "yoasobi",
    required: false,
    description: "아티스트 슬러그",
  })
  slug?: string;
}

export class SongDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ example: "밤을 달리다", required: false })
  titleKo?: string;

  @ApiProperty({ example: "JPOP", required: false })
  catalog?: string;

  @ApiProperty({ type: [ArtistSongDto] })
  artists: ArtistSongDto[];

  @ApiProperty({ type: [KaraokeSongDto], required: false })
  karaokeSongs?: KaraokeSongDto[];

  @ApiProperty({ example: "https://i.ytimg.com/vi/x8VYWazR5mE/default.jpg", required: false })
  thumbnailDefault?: string;

  @ApiProperty({ example: "https://i.ytimg.com/vi/x8VYWazR5mE/mqdefault.jpg", required: false })
  thumbnailMedium?: string;

  @ApiProperty({ example: "https://i.ytimg.com/vi/x8VYWazR5mE/hqdefault.jpg", required: false })
  thumbnailHigh?: string;
}
