import { Injectable } from "@nestjs/common";
import type { Song } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";
import type { SongRepository } from "../song.repository";

@Injectable()
export class SongPrismaRepository implements SongRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Song[]> {
    return this.prisma.song.findMany({
      include: { karaokeSongs: true },
      orderBy: { id: "asc" },
    });
  }

  async findById(id: number): Promise<Song | null> {
    return this.prisma.song.findUnique({
      where: { id },
      include: { karaokeSongs: true },
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
          { title: { contains: lowerQuery, mode: "insensitive" } },
          { titleKo: { contains: lowerQuery, mode: "insensitive" } },
        ],
      },
      include: { karaokeSongs: true },
      orderBy: { id: "asc" },
    });
  }

  async findByArtistId(artistId: number): Promise<Song[]> {
    return this.prisma.song.findMany({
      where: {
        artistSongs: {
          some: {
            artistId,
          },
        },
      },
      include: { karaokeSongs: true },
      orderBy: { id: "asc" },
    });
  }

  async findByArtistIds(artistIds: number[]): Promise<Song[]> {
    return this.prisma.song.findMany({
      where: {
        artistSongs: {
          some: {
            artistId: { in: artistIds },
          },
        },
      },
      include: { karaokeSongs: true },
      orderBy: { id: "asc" },
    });
  }
}
