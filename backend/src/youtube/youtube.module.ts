import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { YoutubeService } from "./youtube.service";

@Module({
  imports: [PrismaModule],
  providers: [YoutubeService],
  exports: [YoutubeService],
})
export class YoutubeModule {}
