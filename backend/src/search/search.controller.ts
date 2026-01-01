import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { YoutubeService } from "../youtube/youtube.service";
import { ApiResponse } from "../dto/api-response.dto";

@ApiTags("Search")
@Controller("search")
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly youtubeService: YoutubeService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "통합 검색 (제목, 가수, 노래방 번호)",
    description:
      "입력한 검색어를 곡 제목, 아티스트 이름, 노래방 번호 필드에서 동시에 검색하여 결과를 반환합니다.",
  })
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
  @ApiOperation({
    summary: "노래방 곡 번호 검색",
    description:
      "노래방 번호로 정확하게 검색합니다. provider 를 지정하면 특정 기기만 필터링할 수 있습니다.",
  })
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
  @ApiOperation({
    summary: "아티스트 이름으로 검색",
    description:
      "입력한 이름을 포함하는 아티스트를 검색하여 간단한 정보 목록을 반환합니다.",
  })
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
  @ApiOperation({
    summary: "곡 제목으로 검색",
    description:
      "곡 제목 또는 한글 제목이 검색어를 포함하는 항목을 반환합니다.",
  })
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

  @Get("youtube-oembed")
  @ApiOperation({ summary: "YouTube 동영상 OEmbed 데이터 조회" })
  @ApiQuery({ name: "url", description: "YouTube 동영상 URL" })
  @SwaggerApiResponse({
    status: 200,
    description: "OEmbed 데이터",
    schema: {
      example: {
        data: {
          title: "YOASOBI - 夜に駆ける",
          author_name: "YOASOBI",
          provider_name: "YouTube",
          thumbnail_url: "https://img.youtube.com/vi/xyz/default.jpg",
        },
      },
    },
  })
  @SwaggerApiResponse({ status: 400, description: "URL 파라미터 필요" })
  async getYoutubeOembed(@Query("url") url: string) {
    if (!url) {
      throw new BadRequestException("URL parameter is required");
    }

    const data = await this.youtubeService.getOembedData(url);
    return ApiResponse.success(data);
  }
}
