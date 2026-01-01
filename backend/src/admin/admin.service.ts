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
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
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
