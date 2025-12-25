import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { BlogScrapeService } from './blog-scrape.service';

@Controller('blog-scrape')
export class BlogScrapeController {
  constructor(private readonly blogScrapeService: BlogScrapeService) {}

  @Get()
  async scrapeBlog(@Query('id') id: string) {
    if (!id) {
      throw new BadRequestException('id parameter is required');
    }

    const url = `https://j-pop-playlist.tistory.com/${id}`;
    const songs = await this.blogScrapeService.scrapeSongs(url);
    return {
      success: true,
      count: songs.length,
      data: songs,
    };
  }
}
