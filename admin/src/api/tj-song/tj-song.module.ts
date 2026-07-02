import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { TjSongController } from "./tj-song.controller";
import { TjSongService } from "./tj-song.service";

@Module({
  imports: [PrismaModule],
  controllers: [TjSongController],
  providers: [TjSongService],
})
export class TjSongModule {}
