import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SongQueueListResponseDto } from "./dto/song-queue-list-response.dto";

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SongQueueListResponseDto> {
    const items = await this.prisma.songQueue.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      data: items.map((item) => ({
        id: item.id,
        tjNumber: item.tjNumber,
        title: item.title,
        artist: item.artist ?? undefined,
        publishdate: item.publishdate ?? undefined,
        catalog: item.catalog ?? undefined,
        createdAt: item.createdAt,
      })),
    };
  }
}
