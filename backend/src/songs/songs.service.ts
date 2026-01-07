import { Injectable } from "@nestjs/common";
import { Provider } from "@prisma/client";
import { KaraokeSongDto, SongDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";

type SongWithRelations = {
  id: number;
  title: string;
  titleKo: string | null;
  catalog: string | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  karaokeSongs: { provider: Provider; karaokeNo: string }[];
  artistSongs: {
    artistId: number;
    role: string | null;
    artist: { name: string; nameKo: string; slug: string | null };
  }[];
};

type TjSongMap = Record<string, { title: string; artist: string | null }>;

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  private readonly songDtoSelect = {
    id: true,
    title: true,
    titleKo: true,
    catalog: true,
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
        artist: {
          select: {
            name: true,
            nameKo: true,
            slug: true,
          },
        },
      },
    },
  };

  private async buildTjSongMap(songs: SongWithRelations[]): Promise<TjSongMap> {
    const tjKaraokeNos = Array.from(
      new Set(
        songs
          .flatMap((song) => song.karaokeSongs)
          .filter((karaokeSong) => karaokeSong.provider === Provider.TJ)
          .map((karaokeSong) => karaokeSong.karaokeNo),
      ),
    );

    if (!tjKaraokeNos.length) {
      return {};
    }

    const tjSongs = await this.prisma.tjSong.findMany({
      where: { id: { in: tjKaraokeNos } },
      select: { id: true, title: true, artist: true },
    });

    return tjSongs.reduce<TjSongMap>((acc, tjSong) => {
      acc[tjSong.id] = { title: tjSong.title, artist: tjSong.artist ?? null };
      return acc;
    }, {});
  }

  private mapToDto(song: SongWithRelations, tjSongMap: TjSongMap): SongDto {
    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo ?? undefined,
      catalog: song.catalog ?? undefined,
      artists: song.artistSongs.map((as) => ({
        artistId: as.artistId,
        name: as.artist.name,
        nameKo: as.artist.nameKo,
        role: as.role ?? undefined,
        slug: as.artist.slug ?? undefined,
      })),
      karaokeSongs: song.karaokeSongs.map((karaokeSong) => {
        const dto: KaraokeSongDto = {
          provider: karaokeSong.provider,
          karaokeNo: karaokeSong.karaokeNo,
        };

        if (karaokeSong.provider === Provider.TJ) {
          const details = tjSongMap[karaokeSong.karaokeNo];
          dto.title = details?.title ?? null;
          dto.artist = details?.artist ?? null;
        }

        return dto;
      }),
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

    const tjSongMap = await this.buildTjSongMap(songs);
    return songs.map((song) => this.mapToDto(song, tjSongMap));
  }

  async findById(id: number): Promise<SongDto | null> {
    const song = await this.prisma.song.findUnique({
      where: { id },
      select: this.songDtoSelect,
    });

    if (!song) return null;

    const tjSongMap = await this.buildTjSongMap([song]);
    return this.mapToDto(song, tjSongMap);
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

    const tjSongMap = await this.buildTjSongMap(songs);
    return songs.map((song) => this.mapToDto(song, tjSongMap));
  }

  async findByArtistId(
    artistId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ songs: SongDto[]; total: number }> {
    // 1. 주어진 artistId로 Artist 조회
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
    });

    let targetArtistIds: number[] = [artistId];

    // slug는 한 개만 허용하므로 추가 매핑 없음

    const skip = (page - 1) * limit;

    const whereClause = {
      artistSongs: {
        some: {
          artistId: { in: targetArtistIds },
        },
      },
    };

    // 전체 개수 조회
    const total = await this.prisma.song.count({ where: whereClause });

    // 3. 곡 조회 (필요한 필드만 select)
    const songs = await this.prisma.song.findMany({
      where: whereClause,
      select: this.songDtoSelect,
      orderBy: { id: "asc" },
      take: limit,
      skip,
    });

    // 4. DTO로 변환
    const tjSongMap = await this.buildTjSongMap(songs);
    return {
      songs: songs.map((song) => this.mapToDto(song, tjSongMap)),
      total,
    };
  }
}
