import { ApiProperty } from "@nestjs/swagger";

export class KaraokeSongDto {
  @ApiProperty({ example: "TJ" })
  provider: string;

  @ApiProperty({ example: "12345" })
  karaokeNo: string;
}

export class SongDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ example: "밤을 달리다", required: false })
  titleKo?: string | null;

  @ApiProperty({ example: [1, 2], type: [Number] })
  artistIds: number[];

  @ApiProperty({ type: [KaraokeSongDto], required: false })
  karaokeSongs?: KaraokeSongDto[];
}

export class SongListResponseDto {
  @ApiProperty({ type: [SongDto] })
  data: SongDto[];

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}

export class SongDetailResponseDto {
  @ApiProperty({ type: SongDto })
  data: SongDto;

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}
