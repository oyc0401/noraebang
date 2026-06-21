import { Injectable } from "@nestjs/common";
import { JpopTjArtistIndex } from "../../lib/jpopTjArtistIndex";
import { PrismaService } from "../../prisma/prisma.service";
import {
  type SongArtistQueueListQueryDto,
  type SongArtistQueueSortBy,
  type SongArtistQueueStatusFilter,
  type SortOrder,
} from "./dto/song-artist-queue-list-query.dto";
import { SongArtistQueueListResponseDto } from "./dto/song-artist-queue-list-response.dto";

type SyncSongArtistQueueResult = {
  scanned: number;
  matched: number;
  unmatched: number;
};

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

  // SongQueue의 JPOP 항목을 SongArtistQueue로 옮기면서 가수 매칭을 시도한다.
  // artistId가 null이면 가수 미매칭 상태이고, 다시 실행하면 매칭이 갱신된다.
  async syncSongArtistQueue(): Promise<SyncSongArtistQueueResult> {
    const items = await this.prisma.songQueue.findMany({
      where: { catalog: "JPOP" },
      select: { tjNumber: true, artist: true },
    });

    const index = await JpopTjArtistIndex.create(this.prisma);
    let matched = 0;
    let unmatched = 0;

    for (const item of items) {
      const artistId = index.findJpopArtistId(item.artist);

      await this.prisma.songArtistQueue.upsert({
        where: { tjSongId: item.tjNumber },
        create: { tjSongId: item.tjNumber, artistId },
        update: { artistId },
      });

      if (artistId !== null) {
        matched += 1;
      } else {
        unmatched += 1;
      }
    }

    return { scanned: items.length, matched, unmatched };
  }
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
