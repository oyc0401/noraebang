import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  type SongQueueCatalogFilter,
  type SongQueueListQueryDto,
  type SongQueueSortBy,
  type SortOrder,
} from "./dto/song-queue-list-query.dto";
import { SongQueueListResponseDto } from "./dto/song-queue-list-response.dto";

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: SongQueueListQueryDto,
  ): Promise<SongQueueListResponseDto> {
    const minNumber = parseBoundedInteger(query.minNumber, 0, 0, 99_999);
    const maxNumber = parseBoundedInteger(query.maxNumber, 99_999, 0, 99_999);
    const catalog = parseCatalog(query.catalog);
    const sortBy = parseSortBy(query.sortBy);
    const sortOrder = parseSortOrder(query.sortOrder);
    const trimmedTitle = query.title?.trim();
    const trimmedArtist = query.artist?.trim();

    const items = await this.prisma.songQueue.findMany({
      where: {
        ...(trimmedTitle && {
          title: { contains: trimmedTitle, mode: Prisma.QueryMode.insensitive },
        }),
        ...(trimmedArtist && {
          artist: { contains: trimmedArtist, mode: Prisma.QueryMode.insensitive },
        }),
        ...(catalog === "NONE" && { catalog: null }),
        ...(catalog && catalog !== "NONE" && { catalog }),
      },
    });

    const filtered = items.filter((item) => {
      const number = Number(item.tjNumber);

      return (
        Number.isInteger(number) && number >= minNumber && number <= maxNumber
      );
    });

    const sorted = sortItems(filtered, sortBy, sortOrder);

    return {
      data: sorted.map((item) => ({
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

type SongQueueRecord = {
  id: number;
  tjNumber: string;
  title: string;
  artist: string | null;
  publishdate: string | null;
  catalog: string | null;
  createdAt: Date;
};

function sortItems(
  items: SongQueueRecord[],
  sortBy: SongQueueSortBy,
  sortOrder: SortOrder,
): SongQueueRecord[] {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title) * direction;
    }

    if (sortBy === "artist") {
      return (a.artist ?? "").localeCompare(b.artist ?? "") * direction;
    }

    if (sortBy === "tjNumber") {
      return (Number(a.tjNumber) - Number(b.tjNumber)) * direction;
    }

    return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
  });
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function parseCatalog(
  value: string | undefined,
): SongQueueCatalogFilter | undefined {
  if (value === "JPOP" || value === "KPOP" || value === "NONE") {
    return value;
  }

  return undefined;
}

function parseSortBy(value: string | undefined): SongQueueSortBy {
  if (
    value === "title" ||
    value === "artist" ||
    value === "tjNumber" ||
    value === "createdAt"
  ) {
    return value;
  }

  return "createdAt";
}

function parseSortOrder(value: string | undefined): SortOrder {
  return value === "asc" ? "asc" : "desc";
}
