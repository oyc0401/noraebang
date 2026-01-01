import { ApiProperty } from "@nestjs/swagger";

export class SearchResultDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ example: "YOASOBI" })
  artistName: string;

  @ApiProperty({ example: "12345" })
  karaokeNo: string;

  @ApiProperty({ example: "TJ" })
  provider: string;
}

export class SearchResultListResponseDto {
  @ApiProperty({ type: [SearchResultDto] })
  data: SearchResultDto[];
}

export class ArtistSearchResultDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "yoasobi", required: false })
  alias?: string | null;
}

export class ArtistSearchResultListResponseDto {
  @ApiProperty({ type: [ArtistSearchResultDto] })
  data: ArtistSearchResultDto[];
}

export class TitleSearchResultDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ example: "밤을 달리다", required: false })
  titleKo?: string | null;
}

export class TitleSearchResultListResponseDto {
  @ApiProperty({ type: [TitleSearchResultDto] })
  data: TitleSearchResultDto[];
}
