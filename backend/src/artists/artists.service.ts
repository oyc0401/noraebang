import { Injectable } from "@nestjs/common";
import type { Artist, YoutubeChannel } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type ArtistWithYoutube = Artist & {
  youtubeChannel: YoutubeChannel | null;
};

@Injectable()
export class ArtistsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
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
