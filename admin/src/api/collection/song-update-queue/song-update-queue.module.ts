import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/prisma.module";
import { SongUpdateQueueController } from "./song-update-queue.controller";
import { SongUpdateQueueManager } from "./song-update-queue.manager";
import { SongUpdateQueueService } from "./song-update-queue.service";

@Module({
  imports: [PrismaModule],
  controllers: [SongUpdateQueueController],
  providers: [SongUpdateQueueManager, SongUpdateQueueService],
})
export class SongUpdateQueueModule {}
