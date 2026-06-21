import { ApiPropertyOptional } from "@nestjs/swagger";

export type SongQueueSortBy = "tjNumber" | "title" | "artist" | "createdAt";
export type SortOrder = "asc" | "desc";
export type SongQueueCatalogFilter = "JPOP" | "KPOP" | "NONE";

export class SongQueueListQueryDto {
  @ApiPropertyOptional({ example: "アイドル" })
  title?: string;

  @ApiPropertyOptional({ example: "YOASOBI" })
  artist?: string;

  @ApiPropertyOptional({ example: "0" })
  minNumber?: string;

  @ApiPropertyOptional({ example: "99999" })
  maxNumber?: string;

  @ApiPropertyOptional({ enum: ["JPOP", "KPOP", "NONE"] })
  catalog?: SongQueueCatalogFilter;

  @ApiPropertyOptional({ enum: ["tjNumber", "title", "artist", "createdAt"] })
  sortBy?: SongQueueSortBy;

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  sortOrder?: SortOrder;
}
