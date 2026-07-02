import { ApiProperty } from "@nestjs/swagger";

export class ArtistListItemDto {
  @ApiProperty({ description: "artist.id", example: 140 })
  id: number;

  @ApiProperty({ example: "あいみょん" })
  name: string;

  @ApiProperty({ example: "아이묭" })
  nameKo: string;

  @ApiProperty({ required: false, example: "あいみょん" })
  nameJa?: string;

  @ApiProperty({ required: false, example: "Aimyon" })
  nameLatin?: string;

  @ApiProperty({ required: false, example: "JPOP" })
  homeCatalog?: string;

  @ApiProperty({ required: false, example: "https://i.ytimg.com/..." })
  thumbnailMedium?: string;

  @ApiProperty({ description: "이 아티스트에 연결된 곡 수", example: 12 })
  songCount: number;
}

export class ArtistListResponseDto {
  @ApiProperty({ type: [ArtistListItemDto] })
  data: ArtistListItemDto[];

  @ApiProperty({ example: 50 })
  nextOffset: number;

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiProperty({ example: 1200 })
  total: number;
}
