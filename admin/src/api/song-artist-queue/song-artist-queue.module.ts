import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SongArtistQueueController } from "./song-artist-queue.controller";
import { SongArtistQueueService } from "./song-artist-queue.service";

@Module({
  imports: [PrismaModule],
  controllers: [SongArtistQueueController],
  providers: [SongArtistQueueService],
})
export class SongArtistQueueModule {}
