import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ArtistCreationQueueController } from "./artist-creation-queue.controller";
import { ArtistCreationQueueService } from "./artist-creation-queue.service";

@Module({
  imports: [PrismaModule],
  controllers: [ArtistCreationQueueController],
  providers: [ArtistCreationQueueService],
})
export class ArtistCreationQueueModule {}
