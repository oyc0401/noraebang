import { ApiPropertyOptional } from "@nestjs/swagger";

export class ArtistSongsQueryDto {
  @ApiPropertyOptional({ description: "곡 제목 검색 (모든 표기)", example: "マリーゴールド" })
  search?: string;
}
