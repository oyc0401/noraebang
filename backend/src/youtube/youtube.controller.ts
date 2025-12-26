import { Controller, Get, Post, Query, BadRequestException, Param } from '@nestjs/common';
import { YoutubeService } from './youtube.service';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get()
  async getOembedData(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL parameter is required');
    }

    const data = await this.youtubeService.getOembedData(url);
    return { data };
  }

  @Get('search-channels')
  async searchChannels(@Query('name') name: string) {
    if (!name) {
      throw new BadRequestException('Artist name is required');
    }

    const data = await this.youtubeService.searchChannels(name);
    return { success: true, data };
  }

  @Post('update-artist-channel/:alias')
  async updateArtistChannel(
    @Param('alias') alias: string,
    @Query('channelId') channelId: string,
  ) {
    if (!channelId) {
      throw new BadRequestException('channelId is required');
    }

    const data = await this.youtubeService.updateArtistChannel(alias, channelId);
    return {
      success: true,
      data,
      message: 'YouTube channel updated successfully'
    };
  }
}
