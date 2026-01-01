import { Module } from "@nestjs/common";
import { SongsModule } from "../songs/songs.module";
import { YoutubeModule } from "../youtube/youtube.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [YoutubeModule, SongsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
