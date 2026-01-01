import { Module } from "@nestjs/common";
import { ArtistsModule } from "../artists/artists.module";
import { SongPrismaRepository } from "../repositories/prisma/song-prisma.repository";
import { SONG_REPOSITORY } from "../repositories/tokens";
import { SongsController } from "./songs.controller";
import { SongsService } from "./songs.service";

@Module({
  imports: [ArtistsModule],
  controllers: [SongsController],
  providers: [
    SongsService,
    {
      provide: SONG_REPOSITORY,
      useClass: SongPrismaRepository,
    },
  ],
  exports: [SongsService],
})
export class SongsModule {}
