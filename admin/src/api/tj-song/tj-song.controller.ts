import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { TjSongListQueryDto } from "./dto/tj-song-list-query.dto";
import { TjSongListResponseDto } from "./dto/tj-song-list-response.dto";
import { TjSongService } from "./tj-song.service";

@ApiTags("tj-song")
@Controller("api/tj-song")
export class TjSongController {
  constructor(private readonly tjSongService: TjSongService) {}

  @Get()
  @ApiOkResponse({
    description: "tj 곡 조회",
    type: TjSongListResponseDto,
  })
  findAll(@Query() query: TjSongListQueryDto): Promise<TjSongListResponseDto> {
    return this.tjSongService.findAll(query);
  }
}
