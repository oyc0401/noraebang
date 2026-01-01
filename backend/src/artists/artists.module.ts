import { Module } from "@nestjs/common";
import { ArtistPrismaRepository } from "../repositories/prisma/artist-prisma.repository";
import { ARTIST_REPOSITORY } from "../repositories/tokens";
import { YoutubeModule } from "../youtube/youtube.module";
import { ArtistsController } from "./artists.controller";
import { ArtistsService } from "./artists.service";

@Module({
  imports: [YoutubeModule],
  controllers: [ArtistsController],
  providers: [
    ArtistsService,
    {
      provide: ARTIST_REPOSITORY,
      useClass: ArtistPrismaRepository,
    },
  ],
  exports: [ArtistsService, ARTIST_REPOSITORY],
})
export class ArtistsModule {}
