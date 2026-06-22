import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
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
    description: "List artist creation queue items",
    type: ArtistCreationQueueListResponseDto,
  })
  findAll(): Promise<ArtistCreationQueueListResponseDto> {
    return this.artistCreationQueueService.findAll();
  }

  @Post("push")
  @ApiOkResponse({
    description: "Push TJ song ids into the artist creation queue",
    type: PushArtistCreationQueueResponseDto,
  })
  push(
    @Body() body: PushArtistCreationQueueRequestDto | undefined,
  ): Promise<PushArtistCreationQueueResponseDto> {
    return this.artistCreationQueueService.pushTjSongIds(body?.tjSongIds);
  }

  @Post(":id/create-artist")
  @ApiOkResponse({
    description: "Create artist from edited form data",
    type: CreateArtistFromQueueResponseDto,
  })
  createArtist(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateArtistFromQueueRequestDto | undefined,
  ): Promise<CreateArtistFromQueueResponseDto> {
    return this.artistCreationQueueService.createArtist(id, body);
  }

  @Delete(":id")
  @ApiOkResponse({
    description: "Delete artist creation queue item",
    type: DeleteArtistCreationQueueResponseDto,
  })
  deleteItem(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<DeleteArtistCreationQueueResponseDto> {
    return this.artistCreationQueueService.deleteItem(id);
  }
}
