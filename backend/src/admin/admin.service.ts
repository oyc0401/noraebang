import { Injectable } from "@nestjs/common";
import {
  ARTIST_ALIAS_GROUPS,
  getArtistAliases,
} from "../config/artist-aliases";
import { PrismaService } from "../prisma/prisma.service";

export interface ArtistListItem {
  id: number;
  name: string;
  nameKo: string;
  alias?: string;
  imageUrl?: string;
  songCount: number;
  aliasGroup?: {
    groupId: string;
    aliases: string[];
  };
}

export interface ArtistSong {
  id: number;
  title: string;
  titleKo?: string;
  role?: string;
  karaokeNumbers: {
    provider: string;
    karaokeNo: string;
  }[];
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getArtists(): Promise<ArtistListItem[]> {
    const artists = await this.prisma.artist.findMany({
      include: {
        _count: {
          select: { artistSongs: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return artists.map((artist): ArtistListItem => {
      // 별칭 그룹 정보 추가
      let aliasGroup: ArtistListItem["aliasGroup"];

      if (artist.alias) {
        const alias = artist.alias;
        const aliases = getArtistAliases(alias);
        if (aliases.length > 1) {
          const group = ARTIST_ALIAS_GROUPS.find((g) =>
            g.aliases.includes(alias),
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
        imageUrl: undefined, // TODO: Add imageUrl to Artist schema
        songCount: artist._count.artistSongs,
        aliasGroup,
      };
    });
  }

  async getArtistSongs(artistId: number): Promise<ArtistSong[]> {
    const artistSongs = await this.prisma.artistSong.findMany({
      where: { artistId },
      include: {
        song: {
          include: {
            karaokeSongs: {
              select: {
                provider: true,
                karaokeNo: true,
              },
            },
          },
        },
      },
      orderBy: { song: { title: "asc" } },
    });

    return artistSongs.map(
      (as): ArtistSong => ({
        id: as.song.id,
        title: as.song.title,
        titleKo: as.song.titleKo ?? undefined,
        role: as.role ?? undefined,
        karaokeNumbers: as.song.karaokeSongs.map((k) => ({
          provider: k.provider,
          karaokeNo: k.karaokeNo,
        })),
      }),
    );
  }
}
