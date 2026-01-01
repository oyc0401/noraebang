import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { YoutubeModule } from "../youtube/youtube.module";
import { ArtistsController } from "./artists.controller";
import { ArtistsService } from "./artists.service";

@Module({
  imports: [PrismaModule, YoutubeModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
  exports: [ArtistsService],
})
export class ArtistsModule {}
