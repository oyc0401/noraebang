import { ApiPropertyOptional } from "@nestjs/swagger";

export type SongArtistQueueSortBy =
  | "createdAt"
  | "tjSongId"
  | "title"
  | "artist";
export type SortOrder = "asc" | "desc";
export type SongArtistQueueStatusFilter = "matched" | "unmatched";

export class SongArtistQueueListQueryDto {
  @ApiPropertyOptional({ example: "アイドル" })
  title?: string;

  @ApiPropertyOptional({ example: "YOASOBI" })
  artist?: string;

  @ApiPropertyOptional({ enum: ["matched", "unmatched"] })
  status?: SongArtistQueueStatusFilter;

  @ApiPropertyOptional({ enum: ["createdAt", "tjSongId", "title", "artist"] })
  sortBy?: SongArtistQueueSortBy;

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  sortOrder?: SortOrder;
}
