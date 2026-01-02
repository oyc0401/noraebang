import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ArtistsModule } from "./artists/artists.module";
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
