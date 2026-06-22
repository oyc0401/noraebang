import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JpopTjArtistIndex } from "../../lib/jpopTjArtistIndex";
import { PrismaService } from "../../prisma/prisma.service";
import { ConnectSongArtistQueueArtistResponseDto } from "./dto/connect-song-artist-queue-artist-response.dto";
import { PushSongArtistQueueResponseDto } from "./dto/push-song-artist-queue-response.dto";
import {
  type SongArtistQueueListQueryDto,
  type SongArtistQueueSortBy,
  type SongArtistQueueStatusFilter,
  type SortOrder,
} from "./dto/song-artist-queue-list-query.dto";
import { SongArtistQueueListResponseDto } from "./dto/song-artist-queue-list-response.dto";

type EnrichedItem = {
  id: number;
  tjSongId: string;
  title: string;
  artist?: string;
  artistId?: number;
  artistName?: string;
  createdAt: Date;
};

@Injectable()
export class SongArtistQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: SongArtistQueueListQueryDto,
  ): Promise<SongArtistQueueListResponseDto> {
    const status = parseStatus(query.status);
    const sortBy = parseSortBy(query.sortBy);
    const sortOrder = parseSortOrder(query.sortOrder);
    const trimmedTitle = query.title?.trim().toLowerCase();
    const trimmedArtist = query.artist?.trim().toLowerCase();

    const items = await this.prisma.songArtistQueue.findMany({
      where: {
        ...(status === "matched" && { artistId: { not: null } }),
        ...(status === "unmatched" && { artistId: null }),
      },
    });

    const tjSongs = await this.prisma.tjSong.findMany({
      where: { id: { in: items.map((item) => item.tjSongId) } },
      select: { id: true, title: true, artist: true },
    });
    const tjSongById = new Map(tjSongs.map((tjSong) => [tjSong.id, tjSong]));

    const artistIds = items
      .map((item) => item.artistId)
      .filter((artistId): artistId is number => artistId !== null);
    const artists = await this.prisma.artist.findMany({
      where: { id: { in: artistIds } },
      select: { id: true, name: true },
    });
    const artistById = new Map(artists.map((artist) => [artist.id, artist]));

    const enriched: EnrichedItem[] = items.map((item) => {
      const tjSong = tjSongById.get(item.tjSongId);
      const artist =
        item.artistId !== null ? artistById.get(item.artistId) : undefined;

      return {
        id: item.id,
        tjSongId: item.tjSongId,
        title: tjSong?.title ?? "",
        artist: tjSong?.artist ?? undefined,
        artistId: item.artistId ?? undefined,
        artistName: artist?.name,
        createdAt: item.createdAt,
      };
    });

    const filtered = enriched.filter((item) => {
      if (trimmedTitle && !item.title.toLowerCase().includes(trimmedTitle)) {
        return false;
      }

      if (trimmedArtist) {
        const haystack =
          `${item.artist ?? ""} ${item.artistName ?? ""}`.toLowerCase();

        if (!haystack.includes(trimmedArtist)) {
          return false;
        }
      }

      return true;
    });

    const sorted = sortItems(filtered, sortBy, sortOrder);

    return { data: sorted };
  }

  async pushItems(items: unknown): Promise<PushSongArtistQueueResponseDto> {
    const pushItems = parsePushItems(items);
    const index = await JpopTjArtistIndex.create(this.prisma);
    let matched = 0;
    let unmatched = 0;

    for (const item of pushItems) {
      const artistId = index.findJpopArtistId(item.artist ?? null);

      await this.prisma.songArtistQueue.upsert({
        where: { tjSongId: item.tjSongId },
        create: { tjSongId: item.tjSongId, artistId },
        update: { artistId },
      });

      if (artistId !== null) {
        matched += 1;
      } else {
        unmatched += 1;
      }
    }

    return {
      requested: pushItems.length,
      pushed: pushItems.length,
      matched,
      unmatched,
    };
  }

  async connectArtist(
    queueId: number,
    artistName: unknown,
  ): Promise<ConnectSongArtistQueueArtistResponseDto> {
    const normalizedArtistName = parseArtistName(artistName);
    const queueItem = await this.prisma.songArtistQueue.findUnique({
      where: { id: queueId },
      select: { id: true },
    });

    if (!queueItem) {
      throw new NotFoundException("song artist queue item not found.");
    }

    const artists = await this.prisma.artist.findMany({
      where: {
        OR: [
          { name: normalizedArtistName },
          { nameKo: normalizedArtistName },
          { nameJa: normalizedArtistName },
          { nameLatin: normalizedArtistName },
          { tjName: normalizedArtistName },
        ],
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { id: "asc" },
    });

    if (artists.length === 0) {
      throw new NotFoundException("artist not found.");
    }

    if (artists.length > 1) {
      throw new BadRequestException("artist name is ambiguous.");
    }

    const artist = artists[0];
    await this.prisma.songArtistQueue.update({
      where: { id: queueId },
      data: { artistId: artist.id },
    });

    return {
      queueId,
      artistId: artist.id,
      artistName: artist.name,
    };
  }
}

type PushItem = {
  tjSongId: string;
  artist?: string;
};

function parsePushItems(items: unknown): PushItem[] {
  if (!Array.isArray(items)) {
    throw new BadRequestException("items must be an array.");
  }

  const itemByTjSongId = new Map<string, PushItem>();

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const tjSongId = String(record.tjSongId ?? "").trim();

    if (!tjSongId) {
      continue;
    }

    const artist =
      typeof record.artist === "string" ? record.artist.trim() : undefined;
    itemByTjSongId.set(tjSongId, {
      tjSongId,
      artist: artist || undefined,
    });
  }

  const pushItems = Array.from(itemByTjSongId.values());

  if (pushItems.length === 0) {
    throw new BadRequestException("items is empty.");
  }

  return pushItems;
}

function parseArtistName(value: unknown): string {
  if (typeof value !== "string") {
    throw new BadRequestException("artistName must be a string.");
  }

  const artistName = value.trim().replace(/\s+/g, " ");

  if (!artistName) {
    throw new BadRequestException("artistName is empty.");
  }

  return artistName;
}

function sortItems(
  items: EnrichedItem[],
  sortBy: SongArtistQueueSortBy,
  sortOrder: SortOrder,
): EnrichedItem[] {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title) * direction;
    }

    if (sortBy === "artist") {
      return (a.artist ?? "").localeCompare(b.artist ?? "") * direction;
    }

    if (sortBy === "tjSongId") {
      return (Number(a.tjSongId) - Number(b.tjSongId)) * direction;
    }

    return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
  });
}

function parseStatus(
  value: string | undefined,
): SongArtistQueueStatusFilter | undefined {
  if (value === "matched" || value === "unmatched") {
    return value;
  }

  return undefined;
}

function parseSortBy(value: string | undefined): SongArtistQueueSortBy {
  if (
    value === "tjSongId" ||
    value === "title" ||
    value === "artist" ||
    value === "createdAt"
  ) {
    return value;
  }

  return "createdAt";
}

function parseSortOrder(value: string | undefined): SortOrder {
  return value === "asc" ? "asc" : "desc";
}
