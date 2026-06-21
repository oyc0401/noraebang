import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SongQueueListResponseDto } from "./dto/song-queue-list-response.dto";
import { QueueService } from "./queue.service";

@ApiTags("queue")
@Controller("queue")
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOkResponse({
    description: "List song queue items",
    type: SongQueueListResponseDto,
  })
  findAll(): Promise<SongQueueListResponseDto> {
    return this.queueService.findAll();
  }
}
