import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SongQueueItemDto } from "./dto/song-queue-item.dto";
import { QueueService } from "./queue.service";

@ApiTags("queue")
@Controller("queue")
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOkResponse({ description: "List song queue items", type: SongQueueItemDto, isArray: true })
  findAll(): Promise<SongQueueItemDto[]> {
    return this.queueService.findAll();
  }
}
