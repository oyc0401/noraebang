import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SongController } from "./song.controller";
import { SongService } from "./song.service";

@Module({
  imports: [PrismaModule],
  controllers: [SongController],
  providers: [SongService],
})
export class SongModule {}
