import { join } from "node:path";
import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

@Controller("admin")
export class AdminPageController {
  @Get()
  getAdminPage(@Res() response: Response): void {
    response.sendFile(join(process.cwd(), "public", "admin", "index.html"));
  }
}
