import { ApiPropertyOptional } from "@nestjs/swagger";

export type ArtistSortBy = "songCount" | "name" | "createdAt";
export type SortOrder = "asc" | "desc";

export class ArtistListQueryDto {
  @ApiPropertyOptional({ description: "아티스트 이름 검색 (모든 표기)", example: "YOASOBI" })
  search?: string;

  @ApiPropertyOptional({ description: "곡이 있는 아티스트만", enum: ["true"] })
  hasSongsOnly?: string;

  @ApiPropertyOptional({ enum: ["songCount", "name", "createdAt"] })
  sortBy?: ArtistSortBy;

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ example: "0" })
  offset?: string;

  @ApiPropertyOptional({ example: "50" })
  limit?: string;
}
