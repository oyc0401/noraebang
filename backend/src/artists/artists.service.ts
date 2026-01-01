import { Injectable } from "@nestjs/common";
import type { Artist, Prisma, YoutubeChannel } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type ArtistDetails = Artist & {
  youtubeChannel: YoutubeChannel | null;
  _count: {
    artistSongs: number;
  };
};

export const ARTIST_SORT_OPTIONS = [
  "id_desc",
  "name_asc",
  "name_desc",
  "subscriber_desc",
  "subscriber_asc",
  "song_count_asc",
  "song_count_desc",
] as const;

export type ArtistSortOption = (typeof ARTIST_SORT_OPTIONS)[number];
export const DEFAULT_ARTIST_SORT: ArtistSortOption = "id_desc";

const ARTIST_SORT_ORDER_MAP: Record<
  ArtistSortOption,
  Prisma.ArtistOrderByWithRelationInput[]
> = {
  id_desc: [{ id: "desc" }],
  name_asc: [{ name: "asc" }, { id: "desc" }],
  name_desc: [{ name: "desc" }, { id: "desc" }],
  subscriber_desc: [
    { youtubeChannel: { subscriberCount: "desc" } },
    { id: "desc" },
  ],
  subscriber_asc: [
    { youtubeChannel: { subscriberCount: "asc" } },
    { id: "desc" },
  ],
  song_count_asc: [{ artistSongs: { _count: "asc" } }, { id: "desc" }],
  song_count_desc: [{ artistSongs: { _count: "desc" } }, { id: "desc" }],
};

@Injectable()
export class ArtistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(sort: ArtistSortOption = DEFAULT_ARTIST_SORT) {
    return this.prisma.artist.findMany({
      orderBy: ARTIST_SORT_ORDER_MAP[sort],
    });
  }

  async findAllDetails(
    sort: ArtistSortOption = DEFAULT_ARTIST_SORT,
  ): Promise<ArtistDetails[]> {
    return this.prisma.artist.findMany({
      include: {
        youtubeChannel: true,
        _count: {
          select: {
            artistSongs: true,
          },
        },
      },
      orderBy: ARTIST_SORT_ORDER_MAP[sort],
    });
  }

  async findById(id: number) {
    return this.prisma.artist.findUnique({
      where: { id },
    });
  }

  async findByAlias(alias: string) {
    return this.prisma.artist.findUnique({
      where: { alias },
    });
  }

  async findByAliases(aliases: string[]) {
    return this.prisma.artist.findMany({
      where: { alias: { in: aliases } },
      orderBy: { id: "asc" },
    });
  }

  /**
   * ID 또는 alias로 아티스트 조회
   * - 숫자면 ID로 조회
   * - 문자열이면 alias로 조회
   */
  async findByIdOrAlias(identifier: string) {
    // 숫자인지 체크
    const parsedId = parseInt(identifier, 10);
    if (!Number.isNaN(parsedId) && parsedId.toString() === identifier) {
      return this.findById(parsedId);
    }

    // alias로 조회
    return this.findByAlias(identifier);
  }
}
