import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { ErrorResponseDto } from "../dto";
import { ApiResponse } from "../dto/api-response.dto";
import { fetchYoutubeOembed } from "../thirdparty/youtube/oembed.js";
import { SearchResponseDto } from "./dto/search-response.dto";
import { SearchSuggestionsQueryDto } from "./dto/search-suggestions-query.dto";
import { SearchSuggestionsResponseDto } from "./dto/search-suggestions-response.dto";
import { YoutubeSongSearchResponseDto } from "./dto/youtube-song-search-response.dto";
import { SearchService } from "./search.service";

@ApiTags("Search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: "통합 검색",
    description: "아티스트와 곡을 통합 검색합니다.",
  })
  @ApiQuery({ name: "query", description: "검색어" })
  @ApiQuery({
    name: "page",
    required: false,
    description: "페이지 번호 (기본값: 1)",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "페이지당 항목 수 (기본값: 20)",
    example: 20,
  })
  @SwaggerApiResponse({
    status: 200,
    description: "검색 결과",
    type: SearchResponseDto,
  })
  @SwaggerApiResponse({
    status: 400,
    description: "검색어 필요",
    type: ErrorResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async search(
    @Query("query") query: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<SearchResponseDto> {
    if (!query) {
      throw new BadRequestException("Query parameter is required");
    }

    const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNumber = limit ? Math.max(1, parseInt(limit, 10)) : 20;

    const { results, total } = await this.searchService.searchUnified(
      query,
      pageNumber,
      limitNumber,
    );

    return {
      data: results,
      message: "검색 성공",
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        hasMore: pageNumber * limitNumber < total,
      },
    };
  }

  @Get("suggestions")
  @ApiOperation({
    summary: "검색 추천어 조회",
    description: "검색 중 노출될 추천 검색어와 추천 아티스트/곡을 반환합니다.",
  })
  @ApiQuery({ name: "query", description: "검색어" })
  @SwaggerApiResponse({
    status: 200,
    description: "추천 검색어 결과",
    type: SearchSuggestionsResponseDto,
  })
  @SwaggerApiResponse({
    status: 400,
    description: "검색어 필요",
    type: ErrorResponseDto,
  })
  async getSearchSuggestions(
    @Query() queryDto: SearchSuggestionsQueryDto,
  ): Promise<SearchSuggestionsResponseDto> {
    const { query } = queryDto;

    return {
      data: {
        cards: [],
      },
      message: "추천 검색어 조회 성공",
    };
  }

  @Get("youtube")
  @ApiOperation({
    summary: "유튜브 URL로 단일곡 검색",
    description:
      "YouTube 링크에서 제목을 추출하고 가장 일치하는 곡 정보를 반환합니다.",
  })
  @ApiQuery({ name: "url", description: "YouTube 동영상 URL" })
  @SwaggerApiResponse({
    status: 200,
    description: "YouTube 정보와 매칭된 곡 데이터",
    type: YoutubeSongSearchResponseDto,
  })
  @SwaggerApiResponse({
    status: 400,
    description: "URL 파라미터 필요",
    type: ErrorResponseDto,
  })
  @SwaggerApiResponse({
    status: 404,
    description: "곡을 찾을 수 없음",
    type: ErrorResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async searchSongByYoutubeUrl(
    @Query("url") url: string,
  ): Promise<YoutubeSongSearchResponseDto> {
    // URL 파라미터 유효성 검사
    if (!url) {
      throw new BadRequestException("URL parameter is required");
    }

    // 유튜브 정보 얻어오기
    const youtube = await fetchYoutubeOembed(url);

    // 제목과 아티스트명으로 곡 검색
    const matchedSongs =
      await this.searchService.searchSongsByTitleAndArtistName({
        title: youtube.title,
        authorName: youtube.author_name,
      });

    // 매칭된 곡이 없으면 404 에러 반환
    if (matchedSongs.length === 0) {
      throw new NotFoundException(
        `No song found matching YouTube title: ${youtube.title}`,
      );
    }

    // 가장 첫 번째 곡을 선택
    const matchedSong = matchedSongs[0];

    return ApiResponse.success(matchedSong, youtube.title);
  }
}
