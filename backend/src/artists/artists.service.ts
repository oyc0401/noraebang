import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { ArtistDetailsDto, ArtistDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";

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
  subscriber_desc: [{ id: "desc" }], // 애플리케이션 레벨에서 정렬
  subscriber_asc: [{ id: "desc" }], // 애플리케이션 레벨에서 정렬
  song_count_asc: [{ artistSongs: { _count: "asc" } }, { id: "desc" }],
  song_count_desc: [{ artistSongs: { _count: "desc" } }, { id: "desc" }],
};

@Injectable()
export class ArtistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    sort: ArtistSortOption = DEFAULT_ARTIST_SORT,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ artists: ArtistDto[]; total: number }> {
    const skip = (page - 1) * limit;

    // 전체 개수 조회
    const total = await this.prisma.artist.count();

    // 구독자순 정렬의 경우 전체를 가져와서 정렬 후 페이지네이션
    const isSubscriberSort =
      sort === "subscriber_desc" || sort === "subscriber_asc";

    const artists = await this.prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjSongRequestUrl: true,
        youtubeChannels: {
          where: {
            type: "MAIN",
          },
          select: {
            subscriberCount: true,
          },
          orderBy: {
            subscriberCount: "desc",
          },
          take: 1,
        },
      },
      orderBy: ARTIST_SORT_ORDER_MAP[sort],
      // 구독자순 정렬이면 전체 가져오기, 아니면 페이지네이션 적용
      ...(isSubscriberSort ? {} : { take: limit, skip }),
    });

    const mappedArtists = artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      slug: artist.slug ?? undefined,
      homeCatalog: artist.homeCatalog ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
      _subscriberCount: artist.youtubeChannels[0]?.subscriberCount,
    }));

    // 구독자 수로 정렬하는 경우 애플리케이션 레벨에서 정렬 후 페이지네이션
    if (sort === "subscriber_desc") {
      const sorted = mappedArtists.sort((a, b) => {
        const aCount = a._subscriberCount ?? null;
        const bCount = b._subscriberCount ?? null;

        if (aCount === null && bCount === null) {
          return b.id - a.id;
        }
        if (aCount === null) return 1;
        if (bCount === null) return -1;

        if (bCount !== aCount) return bCount - aCount;
        return b.id - a.id;
      });

      return {
        artists: sorted
          .slice(skip, skip + limit)
          .map(({ _subscriberCount, ...artist }) => artist),
        total,
      };
    }

    if (sort === "subscriber_asc") {
      const sorted = mappedArtists.sort((a, b) => {
        const aCount = a._subscriberCount ?? null;
        const bCount = b._subscriberCount ?? null;

        if (aCount === null && bCount === null) {
          return b.id - a.id;
        }
        if (aCount === null) return 1;
        if (bCount === null) return -1;

        if (aCount !== bCount) return aCount - bCount;
        return b.id - a.id;
      });

      return {
        artists: sorted
          .slice(skip, skip + limit)
          .map(({ _subscriberCount, ...artist }) => artist),
        total,
      };
    }

    return {
      artists: mappedArtists.map(({ _subscriberCount, ...artist }) => artist),
      total,
    };
  }

  async findAllDetails(
    sort: ArtistSortOption = DEFAULT_ARTIST_SORT,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ artists: ArtistDetailsDto[]; total: number }> {
    const skip = (page - 1) * limit;

    // 전체 개수 조회
    const total = await this.prisma.artist.count();

    // 구독자순 정렬의 경우 전체를 가져와서 정렬 후 페이지네이션
    const isSubscriberSort =
      sort === "subscriber_desc" || sort === "subscriber_asc";

    const artists = await this.prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        youtubeChannels: {
          select: {
            type: true,
            channelId: true,
            title: true,
            description: true,
            customUrl: true,
            subscriberCount: true,
            videoCount: true,
            thumbnailDefault: true,
            thumbnailMedium: true,
            thumbnailHigh: true,
          },
        },
        _count: {
          select: {
            artistSongs: true,
          },
        },
      },
      orderBy: ARTIST_SORT_ORDER_MAP[sort],
      // 구독자순 정렬이면 전체 가져오기, 아니면 페이지네이션 적용
      ...(isSubscriberSort ? {} : { take: limit, skip }),
    });

    const mappedArtists = artists.map((artist) => {
      const mainChannel =
        artist.youtubeChannels.find((ch) => ch.type === "MAIN") ??
        artist.youtubeChannels.find((ch) => ch.type === "TOPIC");

      return {
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        slug: artist.slug ?? undefined,
        homeCatalog: artist.homeCatalog ?? undefined,
        thumbnailDefault: artist.thumbnailDefault ?? undefined,
        thumbnailMedium: artist.thumbnailMedium ?? undefined,
        thumbnailHigh: artist.thumbnailHigh ?? undefined,
        songCount: artist._count.artistSongs,
        youtube: mainChannel
          ? {
              channelId: mainChannel.channelId,
              title: mainChannel.title ?? undefined,
              description: mainChannel.description ?? undefined,
              customUrl: mainChannel.customUrl ?? undefined,
              subscriberCount: mainChannel.subscriberCount ?? undefined,
              videoCount: mainChannel.videoCount ?? undefined,
              thumbnailDefault: mainChannel.thumbnailDefault ?? undefined,
              thumbnailMedium: mainChannel.thumbnailMedium ?? undefined,
              thumbnailHigh: mainChannel.thumbnailHigh ?? undefined,
            }
          : undefined,
      };
    });

    // 구독자 수로 정렬하는 경우 애플리케이션 레벨에서 정렬 후 페이지네이션
    if (sort === "subscriber_desc") {
      const sorted = mappedArtists.sort((a, b) => {
        const aCount = a.youtube?.subscriberCount ?? null;
        const bCount = b.youtube?.subscriberCount ?? null;

        if (aCount === null && bCount === null) {
          return b.id - a.id;
        }
        if (aCount === null) return 1;
        if (bCount === null) return -1;

        if (bCount !== aCount) return bCount - aCount;
        return b.id - a.id;
      });

      return {
        artists: sorted.slice(skip, skip + limit),
        total,
      };
    }

    if (sort === "subscriber_asc") {
      const sorted = mappedArtists.sort((a, b) => {
        const aCount = a.youtube?.subscriberCount ?? null;
        const bCount = b.youtube?.subscriberCount ?? null;

        if (aCount === null && bCount === null) {
          return b.id - a.id;
        }
        if (aCount === null) return 1;
        if (bCount === null) return -1;

        if (aCount !== bCount) return aCount - bCount;
        return b.id - a.id;
      });

      return {
        artists: sorted.slice(skip, skip + limit),
        total,
      };
    }

    return {
      artists: mappedArtists,
      total,
    };
  }

  async findById(id: number): Promise<ArtistDto | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjSongRequestUrl: true,
      },
    });

    if (!artist) return null;

    return {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      slug: artist.slug ?? undefined,
      homeCatalog: artist.homeCatalog ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
    };
  }

  async findBySlug(slug: string): Promise<ArtistDto | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjSongRequestUrl: true,
      },
    });

    if (!artist) return null;

    return {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      slug: artist.slug ?? undefined,
      homeCatalog: artist.homeCatalog ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
    };
  }

  async findBySlugs(slugs: string[]) {
    return this.prisma.artist.findMany({
      where: { slug: { in: slugs } },
      orderBy: { id: "asc" },
    });
  }

  /**
   * ID 또는 slug로 아티스트 상세 조회 (YouTube 정보 포함)
   * - 숫자면 ID로 조회
   * - 문자열이면 slug로 조회
   */
  async findByIdOrSlug(identifier: string): Promise<ArtistDetailsDto | null> {
    // 숫자인지 체크
    const parsedId = parseInt(identifier, 10);
    const isId = !Number.isNaN(parsedId) && parsedId.toString() === identifier;

    const artist = await this.prisma.artist.findUnique({
      where: isId ? { id: parsedId } : { slug: identifier },
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjSongRequestUrl: true,
        youtubeChannels: {
          select: {
            type: true,
            channelId: true,
            title: true,
            description: true,
            customUrl: true,
            subscriberCount: true,
            videoCount: true,
            thumbnailDefault: true,
            thumbnailMedium: true,
            thumbnailHigh: true,
          },
        },
        _count: {
          select: { artistSongs: true },
        },
      },
    });

    if (!artist) return null;

    const mainChannel = artist.youtubeChannels[0];

    return {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      slug: artist.slug ?? undefined,
      homeCatalog: artist.homeCatalog ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      songCount: artist._count.artistSongs,
      tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
      youtube: mainChannel
        ? {
            channelId: mainChannel.channelId,
            title: mainChannel.title ?? undefined,
            description: mainChannel.description ?? undefined,
            customUrl: mainChannel.customUrl ?? undefined,
            subscriberCount: mainChannel.subscriberCount ?? undefined,
            videoCount: mainChannel.videoCount ?? undefined,
            thumbnailDefault: mainChannel.thumbnailDefault ?? undefined,
            thumbnailMedium: mainChannel.thumbnailMedium ?? undefined,
            thumbnailHigh: mainChannel.thumbnailHigh ?? undefined,
          }
        : undefined,
    };
  }
}
