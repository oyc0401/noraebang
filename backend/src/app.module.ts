import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArtistsModule } from './artists/artists.module';
import { SongsModule } from './songs/songs.module';
import { YoutubeModule } from './youtube/youtube.module';
import { BlogScrapeModule } from './blog-scrape/blog-scrape.module';

@Module({
  imports: [
    PrismaModule,
    ArtistsModule,
    SongsModule,
    YoutubeModule,
    BlogScrapeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
