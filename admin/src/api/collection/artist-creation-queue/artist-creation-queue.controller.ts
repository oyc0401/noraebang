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
import { ArtistCreationQueueService } from "./artist-creation-queue.service";
import { ArtistCreationQueueListResponseDto } from "./dto/artist-creation-queue-list-response.dto";
import { CreateArtistFromQueueRequestDto } from "./dto/create-artist-from-queue-request.dto";
import { CreateArtistFromQueueResponseDto } from "./dto/create-artist-from-queue-response.dto";
import { DeleteArtistCreationQueueResponseDto } from "./dto/delete-artist-creation-queue-response.dto";
import { PushArtistCreationQueueRequestDto } from "./dto/push-artist-creation-queue-request.dto";
import { PushArtistCreationQueueResponseDto } from "./dto/push-artist-creation-queue-response.dto";

@ApiTags("artist-creation-queue")
@Controller("api/artist-creation-queue")
export class ArtistCreationQueueController {
  constructor(
    private readonly artistCreationQueueService: ArtistCreationQueueService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: "아티스트 생성 큐에 들어있는 정보를 얻는다.",
    type: ArtistCreationQueueListResponseDto,
  })
  findAll(): Promise<ArtistCreationQueueListResponseDto> {
    return this.artistCreationQueueService.findAll();
  }

  @Post("push")
  @ApiBody({ type: PushArtistCreationQueueRequestDto })
  @ApiOkResponse({
    description: "아티스트 생성 큐에 tj번호를 넣는다.",
    type: PushArtistCreationQueueResponseDto,
  })
  push(
    @Body() body: PushArtistCreationQueueRequestDto | undefined,
  ): Promise<PushArtistCreationQueueResponseDto> {
    return this.artistCreationQueueService.pushTjSongIds(body?.tjSongIds);
  }

  @Post(":queueId/create-artist")
  @ApiParam({
    name: "queueId",
    description: "artist_creation_queue.id: 아티스트 생성 큐 항목 ID",
    example: 1,
  })
  @ApiBody({ type: CreateArtistFromQueueRequestDto })
  @ApiOkResponse({
    description: "아티스트 생성 큐에 있는 특정 id의 아티스트를 생성한다.",
    type: CreateArtistFromQueueResponseDto,
  })
  createArtist(
    @Param("queueId", ParseIntPipe) queueId: number,
    @Body() body: CreateArtistFromQueueRequestDto | undefined,
  ): Promise<CreateArtistFromQueueResponseDto> {
    return this.artistCreationQueueService.createArtist(queueId, body);
  }

  @Delete(":queueId")
  @ApiParam({
    name: "queueId",
    description: "artist_creation_queue.id: 삭제할 아티스트 생성 큐 항목 ID",
    example: 1,
  })
  @ApiOkResponse({
    description: "아티스트 생성 큐 항목 제거",
    type: DeleteArtistCreationQueueResponseDto,
  })
  deleteItem(
    @Param("queueId", ParseIntPipe) queueId: number,
  ): Promise<DeleteArtistCreationQueueResponseDto> {
    return this.artistCreationQueueService.deleteItem(queueId);
  }
}
