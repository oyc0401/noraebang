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
import { CreateSongFromQueueRequestDto } from "./dto/create-song-from-queue-request.dto";
import { CreateSongFromQueueResponseDto } from "./dto/create-song-from-queue-response.dto";
import { DeleteSongCreationQueueResponseDto } from "./dto/delete-song-creation-queue-response.dto";
import { PushSongCreationQueueRequestDto } from "./dto/push-song-creation-queue-request.dto";
import { PushSongCreationQueueResponseDto } from "./dto/push-song-creation-queue-response.dto";
import { SongCreationQueueListResponseDto } from "./dto/song-creation-queue-list-response.dto";
import { SongMediaCandidatesResponseDto } from "./dto/song-media-candidates-response.dto";
import { SongCreationQueueService } from "./song-creation-queue.service";

@ApiTags("song-creation-queue")
@Controller("api/song-creation-queue")
export class SongCreationQueueController {
  constructor(
    private readonly songCreationQueueService: SongCreationQueueService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: "곡 생성 큐에 들어있는 정보를 얻는다.",
    type: SongCreationQueueListResponseDto,
  })
  findAll(): Promise<SongCreationQueueListResponseDto> {
    return this.songCreationQueueService.findAll();
  }

  @Post("push")
  @ApiBody({ type: PushSongCreationQueueRequestDto })
  @ApiOkResponse({
    description:
      "곡 생성 큐에 tj번호를 넣는다. 아티스트 매칭이 안 된 곡은 건너뛴다.",
    type: PushSongCreationQueueResponseDto,
  })
  push(
    @Body() body: PushSongCreationQueueRequestDto | undefined,
  ): Promise<PushSongCreationQueueResponseDto> {
    return this.songCreationQueueService.pushTjSongIds(body?.tjSongIds);
  }

  @Get(":queueId/media-candidates")
  @ApiParam({
    name: "queueId",
    description: "song_creation_queue.id: 곡 생성 큐 항목 ID",
    example: 1,
  })
  @ApiOkResponse({
    description: "media db에서 유튜브/스포티파이 후보 목록을 다시 조회한다.",
    type: SongMediaCandidatesResponseDto,
  })
  getMediaCandidates(
    @Param("queueId", ParseIntPipe) queueId: number,
  ): Promise<SongMediaCandidatesResponseDto> {
    return this.songCreationQueueService.getMediaCandidates(queueId);
  }

  @Post(":queueId/create-song")
  @ApiParam({
    name: "queueId",
    description: "song_creation_queue.id: 곡 생성 큐 항목 ID",
    example: 1,
  })
  @ApiBody({ type: CreateSongFromQueueRequestDto })
  @ApiOkResponse({
    description: "곡 생성 큐에 있는 특정 id의 곡을 생성한다. (visible=true)",
    type: CreateSongFromQueueResponseDto,
  })
  createSong(
    @Param("queueId", ParseIntPipe) queueId: number,
    @Body() body: CreateSongFromQueueRequestDto | undefined,
  ): Promise<CreateSongFromQueueResponseDto> {
    return this.songCreationQueueService.createSong(queueId, body);
  }

  @Delete(":queueId")
  @ApiParam({
    name: "queueId",
    description: "song_creation_queue.id: 삭제할 곡 생성 큐 항목 ID",
    example: 1,
  })
  @ApiOkResponse({
    description: "곡 생성 큐 항목 제거",
    type: DeleteSongCreationQueueResponseDto,
  })
  deleteItem(
    @Param("queueId", ParseIntPipe) queueId: number,
  ): Promise<DeleteSongCreationQueueResponseDto> {
    return this.songCreationQueueService.deleteItem(queueId);
  }
}
