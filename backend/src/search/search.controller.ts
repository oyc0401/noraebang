import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import {
  CurrentUser,
  type CurrentUserData,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard, OptionalJwtAuthGuard } from "../auth/guards";
import { ErrorResponseDto } from "../dto";
import { RecentSearchesResponseDto } from "./dto/recent-searches-response.dto";
import { SaveSearchClickDto } from "./dto/save-search-click.dto";
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
  @UseGuards(OptionalJwtAuthGuard)
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
    @CurrentUser() user?: CurrentUserData,
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

    // 첫 페이지이고 로그인 유저이면 검색 기록 저장
    if (pageNumber === 1 && user?.id) {
      this.searchService.saveSearchHistory(user.id, query).catch(() => {});
    }

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
    summary: "검색 자동완성",
    description: "검색어를 기반으로 자동완성 결과(아티스트, 곡)를 반환합니다.",
  })
  @ApiQuery({
    name: "query",
    description: "검색어",
    required: false,
  })
  @SwaggerApiResponse({
    status: 200,
    description: "자동완성 결과",
    type: SearchSuggestionsResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async getSearchSuggestions(
    @Query() queryDto: SearchSuggestionsQueryDto,
  ): Promise<SearchSuggestionsResponseDto> {
    const cards = await this.searchService.getAutocomplete(queryDto.query);

    return {
      data: {
        cards,
      },
      message: "자동완성 조회 성공",
    };
  }

  @Get("youtube")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: "유튜브 URL로 단일곡 검색",
    description:
      "YouTube 링크에서 제목을 추출하고 가장 일치하는 곡 정보를 반환합니다. DB에서 곡을 찾지 못한 경우 유튜브 정보를 반환합니다.",
  })
  @ApiQuery({ name: "url", description: "YouTube 동영상 URL" })
  @SwaggerApiResponse({
    status: 200,
    description: "YouTube 정보와 매칭된 곡 데이터 또는 유튜브 정보만",
    type: YoutubeSongSearchResponseDto,
  })
  @SwaggerApiResponse({
    status: 400,
    description: "URL 파라미터 필요",
    type: ErrorResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async searchSongByYoutubeUrl(
    @Query("url") url: string,
    @CurrentUser() user?: CurrentUserData,
  ): Promise<YoutubeSongSearchResponseDto> {
    if (!url) {
      throw new BadRequestException("URL parameter is required");
    }

    const { songs, matchedByVideoId } =
      await this.searchService.findSongByYoutubeUrl(url);

    // 로그인 유저이면 검색 기록 저장
    if (user?.id) {
      this.searchService.saveSearchHistory(user.id, undefined, url).catch(() => {});
    }

    return {
      songs,
      matchedByVideoId,
      message:
        songs.length > 0
          ? "DB에서 곡을 찾았습니다"
          : "DB에서 곡을 찾지 못했습니다",
    };
  }

  @Get("recent")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "최근/인기 검색어 조회",
    description:
      "로그인 시 최근 검색어와 인기 검색어를, 비로그인 시 인기 검색어만 반환합니다.",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "검색어 추천 목록",
    type: RecentSearchesResponseDto,
  })
  async getRecentSearches(
    @CurrentUser() user?: CurrentUserData,
  ): Promise<RecentSearchesResponseDto> {
    const [recents, populars] = await Promise.all([
      user ? this.searchService.getRecentSearches(user.id, 10) : [],
      this.searchService.getPopularSearches(8),
    ]);

    return {
      data: { recents, populars },
      message: "검색어 추천 조회 성공",
    };
  }

  @Post("click")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "검색 클릭 기록 저장",
    description: "검색 결과에서 클릭한 아티스트/곡을 저장합니다.",
  })
  @SwaggerApiResponse({ status: 201, description: "저장 성공" })
  @SwaggerApiResponse({ status: 401, description: "인증 필요", type: ErrorResponseDto })
  async saveSearchClick(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SaveSearchClickDto,
  ): Promise<void> {
    await this.searchService.saveSearchClick(user.id, dto.query, dto.url, dto.artistId, dto.songId);
  }
}
