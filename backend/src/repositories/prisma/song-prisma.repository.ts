import { Injectable } from '@nestjs/common';
import { SongRepository } from '../song.repository';
import type { Song } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SongPrismaRepository implements SongRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Song[]> {
    return this.prisma.song.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number): Promise<Song | null> {
    return this.prisma.song.findUnique({
      where: { id },
    });
  }

  async searchByTitle(query: string): Promise<Song[]> {
    if (!query.trim()) {
      return this.findAll();
    }

    const lowerQuery = query.toLowerCase();

    return this.prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: lowerQuery, mode: 'insensitive' } },
          { titleKo: { contains: lowerQuery, mode: 'insensitive' } },
          { titleNorm: { contains: lowerQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: { id: 'asc' },
    });
  }

  async findByArtistId(artistId: number): Promise<Song[]> {
    return this.prisma.song.findMany({
      where: { artistId },
      orderBy: { id: 'asc' },
    });
  }
}
