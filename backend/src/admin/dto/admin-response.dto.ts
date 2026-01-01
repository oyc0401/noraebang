import { ApiProperty } from "@nestjs/swagger";

export class AliasGroupDto {
  @ApiProperty({ example: "yoasobi" })
  groupId: string;

  @ApiProperty({ example: ["yoasobi", "아야세"], type: [String] })
  aliases: string[];
}

export class AdminArtistDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({ example: "yoasobi", required: false })
  alias?: string | null;

  @ApiProperty({ example: 25 })
  songCount: number;

  @ApiProperty({ type: AliasGroupDto, required: false })
  aliasGroup?: AliasGroupDto | null;
}

export class AdminKaraokeNumberDto {
  @ApiProperty({ example: "TJ" })
  provider: string;

  @ApiProperty({ example: "12345" })
  karaokeNo: string;
}

export class AdminSongDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ example: "밤을 달리다", required: false })
  titleKo?: string | null;

  @ApiProperty({ example: "MAIN", required: false })
  role?: string | null;

  @ApiProperty({ type: [AdminKaraokeNumberDto] })
  karaokeNumbers: AdminKaraokeNumberDto[];
}

export class AdminArtistListResponseDto {
  @ApiProperty({ type: [AdminArtistDto] })
  data: AdminArtistDto[];

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}

export class AdminSongListResponseDto {
  @ApiProperty({ type: [AdminSongDto] })
  data: AdminSongDto[];

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}
