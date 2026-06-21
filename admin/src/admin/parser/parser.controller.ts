import { Controller, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
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
}
