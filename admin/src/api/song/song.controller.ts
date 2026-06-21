import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SongListQueryDto } from "./dto/song-list-query.dto";
import { SongListResponseDto } from "./dto/song-list-response.dto";
import { SongService } from "./song.service";

@ApiTags("song")
@Controller("api/song")
export class SongController {
  constructor(private readonly songService: SongService) {}

  @Get()
  @ApiOkResponse({
    description: "List TJ songs",
    type: SongListResponseDto,
  })
  findAll(@Query() query: SongListQueryDto): Promise<SongListResponseDto> {
    return this.songService.findAll(query);
  }
}
