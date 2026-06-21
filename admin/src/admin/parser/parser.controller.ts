import { Controller, Get, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SearchParserLogResponseDto } from "./dto/search-parser-log-response.dto";
import { ParserService } from "./parser.service";

@ApiTags("parser")
@Controller("parser")
export class ParserController {
  constructor(private readonly parserService: ParserService) {}

  @Post("recent")
  @ApiOkResponse({ description: "Run recent TJ song parser" })
  runRecentParser(): ReturnType<ParserService["runRecentParser"]> {
    return this.parserService.runRecentParser();
  }

  @Post("search")
  @ApiOkResponse({ description: "Run TJ artist search parser" })
  runSearchParser(): ReturnType<ParserService["runSearchParser"]> {
    return this.parserService.runSearchParser();
  }

  @Get("search/log")
  @ApiOkResponse({
    description: "Get TJ artist search parser log",
    type: SearchParserLogResponseDto,
  })
  getSearchParserLog(): Promise<SearchParserLogResponseDto> {
    return this.parserService.getSearchParserLog();
  }
}
