import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { RemoveSongQueueItemsRequestDto } from "./dto/remove-song-queue-items-request.dto";
import { RemoveSongQueueItemsResponseDto } from "./dto/remove-song-queue-items-response.dto";
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

  @Post("remove")
  @ApiOkResponse({
    description: "Remove selected song queue items by TJ numbers",
    type: RemoveSongQueueItemsResponseDto,
  })
  removeItems(
    @Body() body: RemoveSongQueueItemsRequestDto | undefined,
  ): Promise<RemoveSongQueueItemsResponseDto> {
    return this.queueService.removeItems(body?.tjNumbers);
  }
}
