import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { SongQueueItemDto } from "./dto/song-queue-item.dto";

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SongQueueItemDto[]> {
    const items = await this.prisma.songQueue.findMany({
      orderBy: { createdAt: "desc" },
    });

    return items.map((item) => ({
      id: item.id,
      tjNumber: item.tjNumber,
      title: item.title,
      artist: item.artist ?? undefined,
      publishdate: item.publishdate ?? undefined,
      catalog: item.catalog ?? undefined,
      createdAt: item.createdAt,
    }));
  }
}
