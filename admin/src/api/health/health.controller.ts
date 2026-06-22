import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: "기본 헬스체크" })
  getHealth() {
    return {
      service: "jpop-server",
      status: "ok",
    };
  }

  @Get("health/db")
  @ApiOkResponse({ description: "DB 연결 헬스체크" })
  async getDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      database: "jpop",
      status: "ok",
    };
  }
}
