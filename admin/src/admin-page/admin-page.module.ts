import { Module } from "@nestjs/common";
import { AdminPageController } from "./admin-page.controller";

@Module({
  controllers: [AdminPageController],
})
export class AdminPageModule {}
