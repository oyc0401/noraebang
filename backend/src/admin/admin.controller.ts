import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiResponse } from '../common/dto/api-response.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Artist 목록 조회 (곡 수 포함)
   */
  @Get('artists')
  async getArtists() {
    const artists = await this.adminService.getArtists();
    return ApiResponse.success(artists);
  }

  /**
   * 특정 Artist의 곡 목록 조회
   */
  @Get('artists/:id/songs')
  async getArtistSongs(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const songs = await this.adminService.getArtistSongs(id);
    return ApiResponse.success(songs);
  }
}
