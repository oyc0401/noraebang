import { ApiProperty } from "@nestjs/swagger";

export class KaraokeSongDto {
  @ApiProperty({ example: "TJ" })
  provider: string;

  @ApiProperty({ example: "12345" })
  karaokeNo: string;
}

export class ArtistSongDto {
  @ApiProperty({ example: 1 })
  artistId: number;

  @ApiProperty({
    example: "MAIN",
    required: false,
    enum: ["MAIN", "FEATURING", "PRODUCER"],
  })
  role?: string;
}

export class SongDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ example: "밤을 달리다", required: false })
  titleKo?: string;

  @ApiProperty({ example: "JP", required: false })
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
