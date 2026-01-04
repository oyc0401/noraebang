import { Module } from "@nestjs/common";
import { ArtistsModule } from "../artists/artists.module";
import { SongsModule } from "../songs/songs.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [ArtistsModule, SongsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
