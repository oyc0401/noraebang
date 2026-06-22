import { ApiProperty } from "@nestjs/swagger";

export class ArtistCreationQueueItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ required: false, example: "12345" })
  tjSongId?: string;

  @ApiProperty({ required: false, example: "JPOP" })
  homeCatalog?: string;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({ required: false, example: "夜遊び" })
  nameJa?: string;

  @ApiProperty({ required: false, example: "よあそび" })
  nameJaKana?: string;

  @ApiProperty({ required: false, example: "yoasobi" })
  nameJaPronu?: string;

  @ApiProperty({ required: false, example: "YOASOBI" })
  nameLatin?: string;

  @ApiProperty({ required: false, example: "yoasobi" })
  nameLatinPronu?: string;

  @ApiProperty({ required: false, example: "YOASOBI" })
  tjName?: string;

  @ApiProperty({ required: false, example: "yoasobi" })
  slug?: string;

  @ApiProperty({ required: false, example: "UC..." })
  youtubeChannel?: string;

  @ApiProperty({ required: false, example: "UC..." })
  youtubeTopicChannel?: string;

  @ApiProperty({ required: false, example: "64tJ2EAv1R6UaZqc4iOCyj" })
  spotifyId?: string;

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
