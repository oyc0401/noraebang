import { ApiProperty } from "@nestjs/swagger";
import { SongListItemDto } from "./song-list-item.dto";

export class SongListResponseDto {
  @ApiProperty({ type: [SongListItemDto] })
  data: SongListItemDto[];

  @ApiProperty({ example: 50 })
  nextOffset: number;

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiProperty({ example: 68511 })
  total: number;
}
