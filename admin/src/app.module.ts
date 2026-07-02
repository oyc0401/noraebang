import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminPageModule } from "./admin-page/admin-page.module";
import { ArtistCreationQueueModule } from "./api/collection/artist-creation-queue/artist-creation-queue.module";
import { ParserModule } from "./api/collection/parser/parser.module";
import { QueueModule } from "./api/collection/queue/queue.module";
import { SongArtistQueueModule } from "./api/collection/song-artist-queue/song-artist-queue.module";
import { SongCreationQueueModule } from "./api/collection/song-creation-queue/song-creation-queue.module";
import { SongModule } from "./api/song/song.module";
import { HealthModule } from "./api/health/health.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminPageModule,
    HealthModule,
    PrismaModule,
    ArtistCreationQueueModule,
    ParserModule,
    QueueModule,
    SongArtistQueueModule,
    SongCreationQueueModule,
    SongModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
