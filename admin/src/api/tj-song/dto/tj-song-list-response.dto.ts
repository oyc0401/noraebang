import { ApiProperty } from "@nestjs/swagger";
import { TjSongListItemDto } from "./tj-song-list-item.dto";

export class TjSongListResponseDto {
  @ApiProperty({ type: [TjSongListItemDto] })
  data: TjSongListItemDto[];

  @ApiProperty({ example: 50 })
  nextOffset: number;

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiProperty({ example: 68511 })
  total: number;
}
