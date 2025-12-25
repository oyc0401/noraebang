import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
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

  @Get('search-artist')
  async searchArtistChannel(@Query('name') name: string) {
    if (!name) {
      throw new BadRequestException('Artist name is required');
    }

    const data = await this.youtubeService.searchArtistChannel(name);
    return { data };
  }
}
