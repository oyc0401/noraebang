import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ApiResponse } from "../common/dto/api-response.dto";
import { AdminService } from "./admin.service";

@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("artists")
  @ApiOperation({ summary: "아티스트 목록 조회 (관리자용, 곡 수 포함)" })
  @SwaggerApiResponse({ status: 200, description: "아티스트 목록" })
  async getArtists() {
    const artists = await this.adminService.getArtists();
    return ApiResponse.success(artists);
  }

  @Get("artists/:id/songs")
  @ApiOperation({ summary: "특정 아티스트의 곡 목록 조회 (관리자용)" })
  @ApiParam({ name: "id", description: "아티스트 ID" })
  @SwaggerApiResponse({ status: 200, description: "곡 목록" })
  async getArtistSongs(@Param("id", ParseIntPipe) id: number) {
    const songs = await this.adminService.getArtistSongs(id);
    return ApiResponse.success(songs);
  }
}
