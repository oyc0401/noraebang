import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Artist 목록 조회 (곡 수 포함)
   */
  @Get('artists')
  async getArtists() {
    return this.adminService.getArtists();
  }

  /**
   * 특정 Artist의 곡 목록 조회
   */
  @Get('artists/:id/songs')
  async getArtistSongs(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getArtistSongs(id);
  }
}
