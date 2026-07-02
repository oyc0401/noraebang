import { ApiPropertyOptional } from "@nestjs/swagger";

export type TjSongSortBy = "title" | "tjNumber" | "artist";
export type SortOrder = "asc" | "desc";
export type TjSongCatalogFilter = "JPOP" | "KPOP" | "POP" | "CPOP" | "NONE";
export type TjSongStatusFilter = "song" | "queueOnly" | "none";

export class TjSongListQueryDto {
  @ApiPropertyOptional({ example: "アイドル" })
  title?: string;

  @ApiPropertyOptional({ example: "YOASOBI" })
  artist?: string;

  @ApiPropertyOptional({ example: "0" })
  minNumber?: string;

  @ApiPropertyOptional({ example: "99999" })
  maxNumber?: string;

  @ApiPropertyOptional({ enum: ["JPOP", "KPOP", "POP", "CPOP", "NONE"] })
  catalog?: TjSongCatalogFilter;

  @ApiPropertyOptional({ enum: ["song", "queueOnly", "none"] })
  status?: TjSongStatusFilter;

  @ApiPropertyOptional({ enum: ["title", "tjNumber", "artist"] })
  sortBy?: TjSongSortBy;

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ example: "0" })
  offset?: string;

  @ApiPropertyOptional({ example: "50" })
  limit?: string;
}
