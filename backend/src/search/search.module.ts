import { Module } from "@nestjs/common";
import { TypesenseModule } from "../typesense/typesense.module";
import { YoutubeModule } from "../youtube/youtube.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [TypesenseModule, YoutubeModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
