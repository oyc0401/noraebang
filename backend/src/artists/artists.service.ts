import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  ARTIST_ALIAS_GROUPS,
  getArtistAliases,
} from "../config/artist-aliases";
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

  async findAll(
    sort: ArtistSortOption = DEFAULT_ARTIST_SORT,
  ): Promise<ArtistDto[]> {
    const artists = await this.prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        nameKo: true,
        alias: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjSongRequestUrl: true,
      },
      orderBy: ARTIST_SORT_ORDER_MAP[sort],
    });

    return artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      alias: artist.alias ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
    }));
  }

  async findAllDetails(
    sort: ArtistSortOption = DEFAULT_ARTIST_SORT,
  ): Promise<ArtistDetailsDto[]> {
    const artists = await this.prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        nameKo: true,
        alias: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        youtubeChannel: {
          select: {
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
    });

    return artists.map((artist) => {
      let aliasGroup: { groupId: string; aliases: string[] } | undefined;

      const artistAlias = artist.alias;
      if (artistAlias) {
        const aliases = getArtistAliases(artistAlias);
        if (aliases.length > 1) {
          const group = ARTIST_ALIAS_GROUPS.find((item) =>
            item.aliases.includes(artistAlias),
          );
          if (group) {
            aliasGroup = {
              groupId: group.groupId,
              aliases,
            };
          }
        }
      }

      return {
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        alias: artist.alias ?? undefined,
        thumbnailDefault: artist.thumbnailDefault ?? undefined,
        thumbnailMedium: artist.thumbnailMedium ?? undefined,
        thumbnailHigh: artist.thumbnailHigh ?? undefined,
        songCount: artist._count.artistSongs,
        aliasGroup,
        youtube: artist.youtubeChannel
          ? {
              channelId: artist.youtubeChannel.channelId,
              title: artist.youtubeChannel.title ?? undefined,
              description: artist.youtubeChannel.description ?? undefined,
              customUrl: artist.youtubeChannel.customUrl ?? undefined,
              subscriberCount:
                artist.youtubeChannel.subscriberCount ?? undefined,
              videoCount: artist.youtubeChannel.videoCount ?? undefined,
              thumbnailDefault:
                artist.youtubeChannel.thumbnailDefault ?? undefined,
              thumbnailMedium:
                artist.youtubeChannel.thumbnailMedium ?? undefined,
              thumbnailHigh: artist.youtubeChannel.thumbnailHigh ?? undefined,
            }
          : undefined,
      };
    });
  }

  async findById(id: number): Promise<ArtistDto | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameKo: true,
        alias: true,
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
      alias: artist.alias ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
    };
  }

  async findByAlias(alias: string): Promise<ArtistDto | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { alias },
      select: {
        id: true,
        name: true,
        nameKo: true,
        alias: true,
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
      alias: artist.alias ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
    };
  }

  async findByAliases(aliases: string[]) {
    return this.prisma.artist.findMany({
      where: { alias: { in: aliases } },
      orderBy: { id: "asc" },
    });
  }

  /**
   * ID 또는 alias로 아티스트 상세 조회 (YouTube 정보 포함)
   * - 숫자면 ID로 조회
   * - 문자열이면 alias로 조회
   */
  async findByIdOrAlias(
    identifier: string,
  ): Promise<ArtistDetailsDto | null> {
    // 숫자인지 체크
    const parsedId = parseInt(identifier, 10);
    const isId = !Number.isNaN(parsedId) && parsedId.toString() === identifier;

    const artist = await this.prisma.artist.findUnique({
      where: isId ? { id: parsedId } : { alias: identifier },
      select: {
        id: true,
        name: true,
        nameKo: true,
        alias: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjSongRequestUrl: true,
        youtubeChannel: true,
        _count: {
          select: { artistSongs: true },
        },
      },
    });

    if (!artist) return null;

    return {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      alias: artist.alias ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      songCount: artist._count.artistSongs,
      tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
      youtube: artist.youtubeChannel
        ? {
            channelId: artist.youtubeChannel.channelId,
            title: artist.youtubeChannel.title ?? undefined,
            description: artist.youtubeChannel.description ?? undefined,
            customUrl: artist.youtubeChannel.customUrl ?? undefined,
            subscriberCount:
              artist.youtubeChannel.subscriberCount ?? undefined,
            videoCount: artist.youtubeChannel.videoCount ?? undefined,
            thumbnailDefault:
              artist.youtubeChannel.thumbnailDefault ?? undefined,
            thumbnailMedium: artist.youtubeChannel.thumbnailMedium ?? undefined,
            thumbnailHigh: artist.youtubeChannel.thumbnailHigh ?? undefined,
          }
        : undefined,
    };
  }
}
