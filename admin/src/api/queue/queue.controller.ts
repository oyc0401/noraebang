import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SongQueueListQueryDto } from "./dto/song-queue-list-query.dto";
import { SongQueueListResponseDto } from "./dto/song-queue-list-response.dto";
import { QueueService } from "./queue.service";

@ApiTags("queue")
@Controller("api/queue")
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOkResponse({
    description: "List song queue items",
    type: SongQueueListResponseDto,
  })
  findAll(
    @Query() query: SongQueueListQueryDto,
  ): Promise<SongQueueListResponseDto> {
    return this.queueService.findAll(query);
  }
}
