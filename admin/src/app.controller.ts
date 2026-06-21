import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class AppController {
  @Get()
  @ApiOkResponse({ description: "Admin server health" })
  getHealth() {
    return {
      service: "jpop-admin",
      status: "ok",
    };
  }
}
