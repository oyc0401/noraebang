import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getArtistAliases, ARTIST_ALIAS_GROUPS } from '../config/artist-aliases';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getArtists() {
    const artists = await this.prisma.artist.findMany({
      include: {
        _count: {
          select: { artistSongs: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return artists.map((artist) => {
      // 별칭 그룹 정보 추가
      let aliasGroup: { groupId: string; aliases: string[] } | null = null;
      if (artist.alias) {
        const aliases = getArtistAliases(artist.alias);
        if (aliases.length > 1) {
          // 그룹에 속해있음
          const group = ARTIST_ALIAS_GROUPS.find(g =>
            g.aliases.includes(artist.alias!)
          );
          if (group) {
            aliasGroup = {
              groupId: group.groupId,
              aliases: aliases,
            };
          }
        }
      }

      return {
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        alias: artist.alias,
        imageUrl: null, // TODO: Add imageUrl to Artist schema
        songCount: artist._count.artistSongs,
        aliasGroup,
      };
    });
  }

  async getArtistSongs(artistId: number) {
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
      orderBy: { song: { title: 'asc' } },
    });

    return artistSongs.map((as) => ({
      id: as.song.id,
      title: as.song.title,
      titleKo: as.song.titleKo,
      role: as.role,
      karaokeNumbers: as.song.karaokeSongs,
    }));
  }
}
