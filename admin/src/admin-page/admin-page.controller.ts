import { join } from "node:path";
import { Controller, Get, Res } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

@ApiTags("AdminPage")
@Controller("admin")
export class AdminPageController {
  @Get(["", "{*path}"])
  @ApiOkResponse({ description: "어드민 프론트 페이지 서빙" })
  getAdminPage(@Res() response: Response): void {
    response.sendFile(join(process.cwd(), "public", "admin", "index.html"));
  }
}
