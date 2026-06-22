import { Controller, Get, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ParserLogResponseDto } from "./dto/parser-log-response.dto";
import { ParserService } from "./parser.service";

@ApiTags("parser")
@Controller("api/parser")
export class ParserController {
  constructor(private readonly parserService: ParserService) {}

  @Post("recent")
  @ApiOkResponse({
    description: "TJ 월별 신곡 API를 실행, 신규곡 발견시 큐에 넣음",
  })
  runRecentParser(): ReturnType<ParserService["runRecentParser"]> {
    return this.parserService.runRecentParser();
  }

  @Post("search")
  @ApiOkResponse({
    description: "TJ 가수검색 실행, 신규곡 발견시 큐에 넣음",
  })
  runSearchParser(): ReturnType<ParserService["runSearchParser"]> {
    return this.parserService.runSearchParser();
  }

  @Get("recent/log")
  @ApiOkResponse({
    description: "신곡 파서 마지막 실행 시각 조회.",
    type: ParserLogResponseDto,
  })
  getRecentParserLog(): Promise<ParserLogResponseDto> {
    return this.parserService.getRecentParserLog();
  }

  @Get("search/log")
  @ApiOkResponse({
    description: "TJ 가수검색 파서 마지막 실행 시각 조회.",
    type: ParserLogResponseDto,
  })
  getSearchParserLog(): Promise<ParserLogResponseDto> {
    return this.parserService.getSearchParserLog();
  }
}
