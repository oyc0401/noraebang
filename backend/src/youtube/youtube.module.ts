import { Module } from "@nestjs/common";
import { ArtistsModule } from "../artists/artists.module";
import { YoutubeService } from "./youtube.service";

@Module({
  imports: [ArtistsModule],
  providers: [YoutubeService],
  exports: [YoutubeService],
})
export class YoutubeModule {}
