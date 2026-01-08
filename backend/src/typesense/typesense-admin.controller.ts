import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalApiGuard } from "../common/guards/internal-api.guard";
import { TypesenseReindexRequestDto } from "./dto/reindex-request.dto";
import { TypesenseIndexingService } from "./typesense-indexing.service";

@ApiTags("Typesense")
@Controller("typesense")
@UseGuards(InternalApiGuard)
export class TypesenseAdminController {
  constructor(
    private readonly typesenseIndexingService: TypesenseIndexingService,
  ) {}

  @Post("reindex")
  @ApiOperation({
    summary: "Typesense 인덱스 재생성",
    description: "아티스트/곡 인덱스를 Typesense에 다시 생성합니다.",
  })
  async reindexCollections(@Body() body: TypesenseReindexRequestDto) {
    const responses: {
      artists?: { indexedCount: number };
      songs?: { indexedCount: number };
    } = {};

    if (body.target === "artists" || body.target === "all") {
      responses.artists = await this.typesenseIndexingService.reindexArtists({
        maxArtistId: body.maxArtistId,
      });
    }

    if (body.target === "songs" || body.target === "all") {
      responses.songs = await this.typesenseIndexingService.reindexSongs({
        maxArtistId: body.maxArtistId,
      });
    }

    return {
      message: "Typesense reindex completed",
      data: responses,
    };
  }
}
