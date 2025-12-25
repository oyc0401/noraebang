import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ScrapeService } from './scrape.service';

@Controller('scrape')
export class ScrapeController {
  constructor(private readonly scrapeService: ScrapeService) {}

  @Get()
  async scrapeUrl(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL parameter is required');
    }

    const songs = await this.scrapeService.scrapeSongs(url);
    return {
      success: true,
      count: songs.length,
      data: songs,
    };
  }
}
