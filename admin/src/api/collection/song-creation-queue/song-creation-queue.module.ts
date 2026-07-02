import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/prisma.module";
import { SongCreationQueueController } from "./song-creation-queue.controller";
import { SongCreationQueueManager } from "./song-creation-queue.manager";
import { SongCreationQueueService } from "./song-creation-queue.service";

@Module({
  imports: [PrismaModule],
  controllers: [SongCreationQueueController],
  providers: [SongCreationQueueManager, SongCreationQueueService],
})
export class SongCreationQueueModule {}
