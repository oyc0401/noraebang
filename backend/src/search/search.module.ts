import { Module } from "@nestjs/common";
import { TypesenseModule } from "../typesense/typesense.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [TypesenseModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
