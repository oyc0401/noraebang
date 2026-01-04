import { Injectable } from "@nestjs/common";
import { getArtistAliases } from "../config/artist-aliases";
import { SongDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  private readonly songDtoSelect = {
    id: true,
    title: true,
    titleKo: true,
    thumbnailDefault: true,
    thumbnailMedium: true,
    thumbnailHigh: true,
    karaokeSongs: {
      select: {
        provider: true,
        karaokeNo: true,
      },
    },
    artistSongs: {
      select: {
        artistId: true,
        role: true,
      },
    },
  };

  private mapToDto(song: {
    id: number;
    title: string;
    titleKo: string | null;
    thumbnailDefault: string | null;
    thumbnailMedium: string | null;
    thumbnailHigh: string | null;
    karaokeSongs: { provider: string; karaokeNo: string }[];
    artistSongs: { artistId: number; role: string | null }[];
  }): SongDto {
    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo ?? undefined,
      artists: song.artistSongs.map((as) => ({
        artistId: as.artistId,
        role: as.role ?? undefined,
      })),
      karaokeSongs: song.karaokeSongs,
      thumbnailDefault: song.thumbnailDefault ?? undefined,
      thumbnailMedium: song.thumbnailMedium ?? undefined,
      thumbnailHigh: song.thumbnailHigh ?? undefined,
    };
  }

  async findAll(): Promise<SongDto[]> {
    const songs = await this.prisma.song.findMany({
      select: this.songDtoSelect,
      orderBy: { id: "asc" },
    });

    return songs.map((song) => this.mapToDto(song));
  }

  async findById(id: number): Promise<SongDto | null> {
    const song = await this.prisma.song.findUnique({
      where: { id },
      select: this.songDtoSelect,
    });

    if (!song) return null;

    return this.mapToDto(song);
  }

  async searchByTitle(query: string): Promise<SongDto[]> {
    if (!query.trim()) {
      return this.findAll();
    }

    const lowerQuery = query.toLowerCase();

    const songs = await this.prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: lowerQuery, mode: "insensitive" } },
          { titleKo: { contains: lowerQuery, mode: "insensitive" } },
        ],
      },
      select: this.songDtoSelect,
      orderBy: { id: "asc" },
    });

    return songs.map((song) => this.mapToDto(song));
  }

  async findByArtistId(artistId: number): Promise<SongDto[]> {
    // 1. 주어진 artistId로 Artist 조회
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
    });

    let targetArtistIds: number[] = [artistId];

    // 2. alias가 있고 별칭 그룹에 속한 경우, 모든 별칭의 아티스트 ID 가져오기
    if (artist?.alias) {
      const allAliases = getArtistAliases(artist.alias);
      if (allAliases.length > 1) {
        const aliasArtists = await this.prisma.artist.findMany({
          where: { alias: { in: allAliases } },
          select: { id: true },
          orderBy: { id: "asc" },
        });
        targetArtistIds = aliasArtists.map((a) => a.id);
      }
    }

    // 3. 곡 조회 (필요한 필드만 select)
    const songs = await this.prisma.song.findMany({
      where: {
        artistSongs: {
          some: {
            artistId: { in: targetArtistIds },
          },
        },
      },
      select: this.songDtoSelect,
      orderBy: { id: "asc" },
    });

    // 4. DTO로 변환
    return songs.map((song) => this.mapToDto(song));
  }
}
