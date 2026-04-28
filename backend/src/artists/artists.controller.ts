import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import {
  CurrentUser,
  type CurrentUserData,
} from "../auth/decorators/current-user.decorator";
import { OptionalJwtAuthGuard } from "../auth/guards";
import { ArtistDetailsDto, ErrorResponseDto } from "../dto";
import { ApiResponse } from "../dto/api-response.dto";
import { SearchService } from "../search/search.service";
import { ArtistsService } from "./artists.service";
import {
  ArtistDetailResponseDto,
} from "./dto/artist-response.dto";

@ApiTags("Artists")
@Controller("artists")
export class ArtistsController {
  constructor(
    private readonly artistsService: ArtistsService,
    private readonly searchService: SearchService,
  ) {}

  @Get(":slug")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: "아티스트 상세 조회 (slug)",
    description: "slug 로 아티스트 상세 정보를 조회합니다.",
  })
  @ApiParam({
    name: "slug",
    description: "아티스트 slug",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "아티스트 상세 정보",
    type: ArtistDetailResponseDto,
  })
  @SwaggerApiResponse({
    status: 404,
    description: "아티스트를 찾을 수 없음",
    type: ErrorResponseDto,
  })
  @SwaggerApiResponse({
    status: 500,
    description: "서버 오류",
    type: ErrorResponseDto,
  })
  async findBySlug(
    @Param("slug") slug: string,
    @CurrentUser() user?: CurrentUserData,
  ): Promise<ArtistDetailResponseDto> {
    const artist: ArtistDetailsDto | null =
      await this.artistsService.findBySlug(slug);
    if (!artist) {
      throw new NotFoundException("Artist not found");
    }

    // 로그인 유저일 때 SearchClick 기록
    if (user?.id) {
      this.searchService
        .saveSearchClick(user.id, undefined, undefined, artist.id, undefined, "artist_page")
        .catch(() => {});
    }

    return ApiResponse.success(artist, "아티스트 정보 조회 성공");
  }
}
