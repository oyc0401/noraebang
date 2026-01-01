import { Injectable } from "@nestjs/common";
import type { Artist } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";
import type { ArtistRepository, ArtistWithYoutube } from "../artist.repository";

@Injectable()
export class ArtistPrismaRepository implements ArtistRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Artist[]> {
    return this.prisma.artist.findMany({
      orderBy: { id: "asc" },
    });
  }

  async findAllWithYoutube(): Promise<ArtistWithYoutube[]> {
    return this.prisma.artist.findMany({
      include: {
        youtubeChannel: true,
      },
      orderBy: {
        youtubeChannel: {
          subscriberCount: "desc",
        },
      },
    });
  }

  async findById(id: number): Promise<Artist | null> {
    return this.prisma.artist.findUnique({
      where: { id },
    });
  }

  async findByAlias(alias: string): Promise<Artist | null> {
    return this.prisma.artist.findUnique({
      where: { alias },
    });
  }

  async findByAliases(aliases: string[]): Promise<Artist[]> {
    return this.prisma.artist.findMany({
      where: { alias: { in: aliases } },
      orderBy: { id: "asc" },
    });
  }
}
