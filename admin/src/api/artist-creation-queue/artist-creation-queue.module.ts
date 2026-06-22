import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ArtistCreationQueueManager } from "./artist-creation-queue.manager";
import { ArtistCreationQueueController } from "./artist-creation-queue.controller";
import { ArtistCreationQueueService } from "./artist-creation-queue.service";

@Module({
  imports: [PrismaModule],
  controllers: [ArtistCreationQueueController],
  providers: [ArtistCreationQueueManager, ArtistCreationQueueService],
})
export class ArtistCreationQueueModule {}
