import { ApiProperty } from "@nestjs/swagger";

export class CreateArtistFromQueueRequestDto {
  @ApiProperty({ required: false, example: "JPOP" })
  homeCatalog?: string | null;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({ required: false, example: "夜遊び" })
  nameJa?: string | null;

  @ApiProperty({ required: false, example: "よあそび" })
  nameJaKana?: string | null;

  @ApiProperty({ required: false, example: "yoasobi" })
  nameJaPronu?: string | null;

  @ApiProperty({ required: false, example: "YOASOBI" })
  nameLatin?: string | null;

  @ApiProperty({ required: false, example: "요아소비" })
  nameLatinPronu?: string | null;

  @ApiProperty({ required: false, example: "YOASOBI" })
  tjName?: string | null;

  @ApiProperty({ required: false, example: "yoasobi" })
  slug?: string | null;

  @ApiProperty({ required: false, example: "UC..." })
  youtubeChannel?: string | null;

  @ApiProperty({ required: false, example: "UC..." })
  youtubeTopicChannel?: string | null;

  @ApiProperty({ required: false, example: "64tJ2EAv1R6UaZqc4iOCyj" })
  spotifyId?: string | null;

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string | null;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string | null;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string | null;
}
