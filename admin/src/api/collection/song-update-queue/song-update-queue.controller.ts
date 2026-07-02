import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { SongMediaCandidatesResponseDto } from "../song-creation-queue/dto/song-media-candidates-response.dto";
import { ApplySongUpdateRequestDto } from "./dto/apply-song-update-request.dto";
import { ApplySongUpdateResponseDto } from "./dto/apply-song-update-response.dto";
import { DeleteSongUpdateQueueResponseDto } from "./dto/delete-song-update-queue-response.dto";
import { PushSongUpdateQueueRequestDto } from "./dto/push-song-update-queue-request.dto";
import { PushSongUpdateQueueResponseDto } from "./dto/push-song-update-queue-response.dto";
import { SongUpdateQueueListResponseDto } from "./dto/song-update-queue-list-response.dto";
import { SongUpdateQueueService } from "./song-update-queue.service";

@ApiTags("song-update-queue")
@Controller("api/song-update-queue")
export class SongUpdateQueueController {
  constructor(
    private readonly songUpdateQueueService: SongUpdateQueueService,
  ) {}

  @Get()
  @ApiOkResponse({
    description:
      "곡 업데이트 큐 항목과 대상 곡의 현재 값(비교용)을 함께 얻는다.",
    type: SongUpdateQueueListResponseDto,
  })
  findAll(): Promise<SongUpdateQueueListResponseDto> {
    return this.songUpdateQueueService.findAll();
  }

  @Post("push")
  @ApiBody({ type: PushSongUpdateQueueRequestDto })
  @ApiOkResponse({
    description:
      "저장된 곡을 업데이트 큐에 넣는다. 곡 없음/가수 미연결/이미 큐에 있음은 건너뛴다.",
    type: PushSongUpdateQueueResponseDto,
  })
  push(
    @Body() body: PushSongUpdateQueueRequestDto | undefined,
  ): Promise<PushSongUpdateQueueResponseDto> {
    return this.songUpdateQueueService.pushSongIds(body?.songIds);
  }

  @Get(":queueId/media-candidates")
  @ApiParam({
    name: "queueId",
    description: "song_update_queue.id: 곡 업데이트 큐 항목 ID",
    example: 1,
  })
  @ApiOkResponse({
    description: "media db에서 유튜브/스포티파이 후보 목록을 다시 조회한다.",
    type: SongMediaCandidatesResponseDto,
  })
  getMediaCandidates(
    @Param("queueId", ParseIntPipe) queueId: number,
  ): Promise<SongMediaCandidatesResponseDto> {
    return this.songUpdateQueueService.getMediaCandidates(queueId);
  }

  @Post(":queueId/apply")
  @ApiParam({
    name: "queueId",
    description: "song_update_queue.id: 곡 업데이트 큐 항목 ID",
    example: 1,
  })
  @ApiBody({ type: ApplySongUpdateRequestDto })
  @ApiOkResponse({
    description:
      "검토한 값으로 곡을 업데이트한다. 제목/썸네일은 덮어쓰고 미디어 연결은 추가만 한다.",
    type: ApplySongUpdateResponseDto,
  })
  applyUpdate(
    @Param("queueId", ParseIntPipe) queueId: number,
    @Body() body: ApplySongUpdateRequestDto | undefined,
  ): Promise<ApplySongUpdateResponseDto> {
    return this.songUpdateQueueService.applyUpdate(queueId, body);
  }

  @Delete(":queueId")
  @ApiParam({
    name: "queueId",
    description: "song_update_queue.id: 삭제할 곡 업데이트 큐 항목 ID",
    example: 1,
  })
  @ApiOkResponse({
    description: "곡 업데이트 큐 항목 제거",
    type: DeleteSongUpdateQueueResponseDto,
  })
  deleteItem(
    @Param("queueId", ParseIntPipe) queueId: number,
  ): Promise<DeleteSongUpdateQueueResponseDto> {
    return this.songUpdateQueueService.deleteItem(queueId);
  }
}
