import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class HealthController {
  @Get()
  @ApiOkResponse({ description: "기본 헬스체크" })
  getHealth() {
    return {
      service: "jpop-media",
      status: "ok",
    };
  }
}
