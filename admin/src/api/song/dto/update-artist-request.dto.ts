import { ApiPropertyOptional } from "@nestjs/swagger";

// PATCH 시맨틱: 포함된 필드만 수정한다. null/빈 문자열은 해당 필드를 비운다.
// name/nameKo는 비울 수 없다(빈 값이면 에러).
export class UpdateArtistRequestDto {
  @ApiPropertyOptional({ example: "あいみょん" })
  name?: string;

  @ApiPropertyOptional({ example: "아이묭" })
  nameKo?: string;

  @ApiPropertyOptional({ nullable: true, example: "あいみょん" })
  nameJa?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "あいみょん" })
  nameJaKana?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "아이묭" })
  nameJaPronu?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "Aimyon" })
  nameLatin?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "아이묜" })
  nameLatinPronu?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "아이묭" })
  tjName?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "aimyon" })
  slug?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "JPOP" })
  homeCatalog?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "UCERU7VjSJdZBKLXTQMwTXKw" })
  youtubeChannel?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "UC8AJRWzKfLbjLPuMg8fM32w" })
  youtubeTopicChannel?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "5faLTiZUXvXATcqDGZTaVQ" })
  spotifyId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "https://i.ytimg.com/default.jpg" })
  thumbnailDefault?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "https://i.ytimg.com/medium.jpg" })
  thumbnailMedium?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "https://i.ytimg.com/high.jpg" })
  thumbnailHigh?: string | null;
}
