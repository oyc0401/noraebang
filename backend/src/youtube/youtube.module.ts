import { Module } from "@nestjs/common";
import { ArtistsModule } from "../artists/artists.module";
import { YoutubeController } from "./youtube.controller";
import { YoutubeService } from "./youtube.service";

@Module({
  imports: [ArtistsModule],
  controllers: [YoutubeController],
  providers: [YoutubeService],
})
export class YoutubeModule {}
