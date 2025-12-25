import { Module } from '@nestjs/common';
import { BlogScrapeController } from './blog-scrape.controller';
import { BlogScrapeService } from './blog-scrape.service';

@Module({
  controllers: [BlogScrapeController],
  providers: [BlogScrapeService],
})
export class BlogScrapeModule {}
