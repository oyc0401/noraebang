import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { ApiResponse } from "../dto/api-response.dto";
import { AdminService } from "./admin.service";
import {
  AdminArtistListResponseDto,
  AdminSongListResponseDto,
} from "./dto/admin-response.dto";

@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("artists")
  @ApiOperation({
    summary: "아티스트 목록 조회 (관리자용, 곡 수 포함)",
    description:
      "관리자 페이지에서 사용하는 API로, 각 아티스트의 곡 개수와 별칭 그룹 정보를 함께 제공합니다.",
  })
  @SwaggerApiResponse({
    status: 200,
    description: "아티스트 목록",
    type: AdminArtistListResponseDto,
  })
  async getArtists(): Promise<AdminArtistListResponseDto> {
    const artists = await this.adminService.getArtists();
    return ApiResponse.success(artists);
  }

  @Get("artists/:id/songs")
  @ApiOperation({
    summary: "특정 아티스트의 곡 목록 조회 (관리자용)",
    description:
      "선택된 아티스트의 곡 목록을 역할(role)과 노래방 번호 정보와 함께 반환합니다.",
  })
  @ApiParam({ name: "id", description: "아티스트 ID" })
  @SwaggerApiResponse({
    status: 200,
    description: "곡 목록",
    type: AdminSongListResponseDto,
  })
  async getArtistSongs(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<AdminSongListResponseDto> {
    const songs = await this.adminService.getArtistSongs(id);
    return ApiResponse.success(songs);
  }
}
