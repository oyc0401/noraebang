import { Controller, Get, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ParserLogResponseDto } from "./dto/parser-log-response.dto";
import { ParserService } from "./parser.service";

@ApiTags("parser")
@Controller("api/parser")
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

  @Get("recent/log")
  @ApiOkResponse({
    description: "Get recent TJ song parser log",
    type: ParserLogResponseDto,
  })
  getRecentParserLog(): Promise<ParserLogResponseDto> {
    return this.parserService.getRecentParserLog();
  }

  @Get("search/log")
  @ApiOkResponse({
    description: "Get TJ artist search parser log",
    type: ParserLogResponseDto,
  })
  getSearchParserLog(): Promise<ParserLogResponseDto> {
    return this.parserService.getSearchParserLog();
  }
}
