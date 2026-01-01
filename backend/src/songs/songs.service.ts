import { Injectable } from "@nestjs/common";
import { getArtistAliases } from "../config/artist-aliases";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.song.findMany({
      include: {
        karaokeSongs: true,
        artistSongs: {
          orderBy: { order: "asc" },
          take: 1,
        },
      },
      orderBy: { id: "asc" },
    });
  }

  async findById(id: number) {
    return this.prisma.song.findUnique({
      where: { id },
      include: {
        karaokeSongs: true,
        artistSongs: {
          orderBy: { order: "asc" },
          take: 1,
        },
      },
    });
  }

  async searchByTitle(query: string) {
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
      include: {
        karaokeSongs: true,
        artistSongs: {
          orderBy: { order: "asc" },
          take: 1,
        },
      },
      orderBy: { id: "asc" },
    });
  }

  async findByArtistId(artistId: number) {
    // 1. 주어진 artistId로 Artist 조회
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!artist || !artist.alias) {
      // alias가 없으면 기본 동작
      return this.prisma.song.findMany({
        where: {
          artistSongs: {
            some: {
              artistId,
            },
          },
        },
        include: {
          karaokeSongs: true,
          artistSongs: {
            orderBy: { order: "asc" },
            take: 1,
          },
        },
        orderBy: { id: "asc" },
      });
    }

    // 2. 별칭 그룹의 모든 별칭 가져오기
    const allAliases = getArtistAliases(artist.alias);

    // 3. 별칭이 하나뿐이면 (그룹에 속하지 않음) 기본 동작
    if (allAliases.length === 1) {
      return this.prisma.song.findMany({
        where: {
          artistSongs: {
            some: {
              artistId,
            },
          },
        },
        include: {
          karaokeSongs: true,
          artistSongs: {
            orderBy: { order: "asc" },
            take: 1,
          },
        },
        orderBy: { id: "asc" },
      });
    }

    // 4. 모든 별칭의 아티스트 조회
    const aliasArtists = await this.prisma.artist.findMany({
      where: { alias: { in: allAliases } },
      orderBy: { id: "asc" },
    });
    const artistIds = aliasArtists.map((a) => a.id);

    // 5. 모든 아티스트의 곡 조회
    return this.prisma.song.findMany({
      where: {
        artistSongs: {
          some: {
            artistId: { in: artistIds },
          },
        },
      },
      include: {
        karaokeSongs: true,
        artistSongs: {
          orderBy: { order: "asc" },
          take: 1,
        },
      },
      orderBy: { id: "asc" },
    });
  }
}
