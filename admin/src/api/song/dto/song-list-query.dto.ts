import { ApiPropertyOptional } from "@nestjs/swagger";

export type SongSortBy = "title" | "tjNumber" | "artist";
export type SortOrder = "asc" | "desc";
export type SongCatalogFilter = "JPOP" | "KPOP";

export class SongListQueryDto {
  @ApiPropertyOptional({ example: "アイドル" })
  title?: string;

  @ApiPropertyOptional({ example: "YOASOBI" })
  artist?: string;

  @ApiPropertyOptional({ example: "0" })
  minNumber?: string;

  @ApiPropertyOptional({ example: "99999" })
  maxNumber?: string;

  @ApiPropertyOptional({ enum: ["JPOP", "KPOP"] })
  catalog?: SongCatalogFilter;

  @ApiPropertyOptional({ enum: ["title", "tjNumber", "artist"] })
  sortBy?: SongSortBy;

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ example: "0" })
  offset?: string;

  @ApiPropertyOptional({ example: "50" })
  limit?: string;
}
