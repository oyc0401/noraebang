import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

    return artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      alias: artist.alias,
      imageUrl: null, // TODO: Add imageUrl to Artist schema
      songCount: artist._count.artistSongs,
    }));
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
