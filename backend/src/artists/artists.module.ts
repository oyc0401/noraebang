import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SongsModule } from "../songs/songs.module";
import { ArtistsController } from "./artists.controller";
import { ArtistsService } from "./artists.service";

@Module({
  imports: [PrismaModule, SongsModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
  exports: [ArtistsService],
})
export class ArtistsModule {}
