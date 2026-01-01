import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { SearchService } from "./search.service";

@ApiTags("Search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: "통합 검색 (제목, 가수, 노래방 번호)" })
  @ApiQuery({ name: "q", required: true, description: "검색어" })
  @ApiQuery({
    name: "provider",
    required: false,
    description: "노래방 기기 (예: TJ, KY)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "최대 반환 개수",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "검색 결과",
    schema: {
      example: {
        data: [
          {
            id: 101,
            title: "夜に駆ける",
            artistName: "YOASOBI",
            karaokeNo: "12345",
            provider: "TJ",
          },
        ],
      },
    },
  })
  async search(
    @Query("q") query: string,
    @Query("provider") provider?: string,
    @Query("limit") limit?: string,
  ) {
    if (!query) {
      return { data: [] };
    }

    const results = await this.searchService.search(query, {
      provider,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { data: results };
  }

  @Get("karaoke")
  @ApiOperation({ summary: "노래방 곡 번호 검색" })
  @ApiQuery({ name: "no", required: true, description: "노래방 번호" })
  @ApiQuery({
    name: "provider",
    required: false,
    description: "노래방 기기 (예: TJ, KY)",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "검색 결과",
    schema: {
      example: {
        data: [
          {
            id: 101,
            title: "夜に駆ける",
            artistName: "YOASOBI",
            karaokeNo: "12345",
            provider: "TJ",
          },
        ],
      },
    },
  })
  async searchByKaraokeNo(
    @Query("no") karaokeNo: string,
    @Query("provider") provider?: string,
  ) {
    if (!karaokeNo) {
      return { data: [] };
    }

    const results = await this.searchService.searchByKaraokeNo(
      karaokeNo,
      provider,
    );

    return { data: results };
  }

  @Get("artist")
  @ApiOperation({ summary: "아티스트 이름으로 검색" })
  @ApiQuery({ name: "name", required: true, description: "아티스트 이름" })
  @SwaggerApiResponse({
    status: 200,
    description: "검색 결과",
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: "YOASOBI",
            alias: "yoasobi",
          },
        ],
      },
    },
  })
  async searchByArtist(@Query("name") artistName: string) {
    if (!artistName) {
      return { data: [] };
    }

    const results = await this.searchService.searchByArtist(artistName);
    return { data: results };
  }

  @Get("title")
  @ApiOperation({ summary: "곡 제목으로 검색" })
  @ApiQuery({ name: "q", required: true, description: "곡 제목" })
  @SwaggerApiResponse({
    status: 200,
    description: "검색 결과",
    schema: {
      example: {
        data: [
          {
            id: 101,
            title: "夜に駆ける",
            titleKo: "밤을 달리다",
          },
        ],
      },
    },
  })
  async searchByTitle(@Query("q") title: string) {
    if (!title) {
      return { data: [] };
    }

    const results = await this.searchService.searchByTitle(title);
    return { data: results };
  }
}
