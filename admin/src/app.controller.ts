import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma/prisma.service";

@ApiTags("health")
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: "Server health" })
  getHealth() {
    return {
      service: "jpop-server",
      status: "ok",
    };
  }

  @Get("health/db")
  @ApiOkResponse({ description: "Database connection health" })
  async getDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      database: "jpop",
      status: "ok",
    };
  }
}
