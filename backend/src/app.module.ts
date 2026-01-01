import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ArtistsModule } from "./artists/artists.module";
import { BlogScrapeModule } from "./blog-scrape/blog-scrape.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SearchModule } from "./search/search.module";
import { SongsModule } from "./songs/songs.module";
import { TypesenseModule } from "./typesense/typesense.module";
import { YoutubeModule } from "./youtube/youtube.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    TypesenseModule,
    SearchModule,
    ArtistsModule,
    SongsModule,
    YoutubeModule,
    BlogScrapeModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
