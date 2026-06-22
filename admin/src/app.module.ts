import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminPageModule } from "./admin-page/admin-page.module";
import { ArtistCreationQueueModule } from "./api/artist-creation-queue/artist-creation-queue.module";
import { ParserModule } from "./api/parser/parser.module";
import { QueueModule } from "./api/queue/queue.module";
import { SongArtistQueueModule } from "./api/song-artist-queue/song-artist-queue.module";
import { SongModule } from "./api/song/song.module";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminPageModule,
    PrismaModule,
    ArtistCreationQueueModule,
    ParserModule,
    QueueModule,
    SongArtistQueueModule,
    SongModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
