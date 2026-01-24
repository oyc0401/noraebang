import { Injectable } from "@nestjs/common";
import { SongDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";


type SongDtoData = {
  id: number;
  title: string;
  titleKo: string | null;
  titleJa: string | null;
  titleLatin: string | null;
  titleJaPronu: string | null;
  titleLatinPronu: string | null;
  catalog: string | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  tjSong: {
    id: string;
    title: string;
    artist: string | null;
    lyricist: string | null;
    composer: string | null;
    publishdate: string | null;
    isMR: boolean;
    isMV: boolean;
    isOver60: boolean;
  } | null;
  artistSongs: {
    artistId: number;
    role: string | null;
    artist: { name: string; nameKo: string; slug: string | null };
  }[];
  songSpotifyTracks: {
    spotifyTrack: {
      spotifyId: string;
      name: string;
      thumbnails: string[];
      popularity: number | null;
    };
  }[];
  youtubeVideos: {
    youtubeVideo: {
      videoId: string;
      title: string | null;
      thumbnailDefault: string | null;
      thumbnailMedium: string | null;
      thumbnailHigh: string | null;
      viewCount: bigint | null;
      publishedAt: Date | null;
    };
  }[];
};

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  private readonly songDtoSelect = {
    id: true,
    title: true,
    titleKo: true,
    titleJa: true,
    titleLatin: true,
    titleJaPronu: true,
    titleLatinPronu: true,
    catalog: true,
    thumbnailDefault: true,
    thumbnailMedium: true,
    thumbnailHigh: true,
    tjSong: {
      select: {
        id: true,
        title: true,
        artist: true,
        lyricist: true,
        composer: true,
        publishdate: true,
        isMR: true,
        isMV: true,
        isOver60: true,
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
    songSpotifyTracks: {
      select: {
        spotifyTrack: {
          select: {
            spotifyId: true,
            name: true,
            thumbnails: true,
            popularity: true,
          },
        },
      },
      orderBy: {
        spotifyTrack: {
          popularity: "desc" as const,
        },
      },
      take: 1,
    },
    youtubeVideos: {
      select: {
        youtubeVideo: {
          select: {
            videoId: true,
            title: true,
            thumbnailDefault: true,
            thumbnailMedium: true,
            thumbnailHigh: true,
            viewCount: true,
            publishedAt: true,
          },
        },
      },
      orderBy: {
        youtubeVideo: {
          viewCount: "desc" as const,
        },
      },
      take: 1,
    },
  };

  private mapToDto(song: SongDtoData): SongDto {
    const spotifyTrack = song.songSpotifyTracks[0]?.spotifyTrack;
    const youtubeVideo = song.youtubeVideos[0]?.youtubeVideo;

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo ?? undefined,
      titleJa: song.titleJa ?? undefined,
      titleLatin: song.titleLatin ?? undefined,
      titleJaPronu: song.titleJaPronu ?? undefined,
      titleLatinPronu: song.titleLatinPronu ?? undefined,
      catalog: song.catalog ?? undefined,
      artists: song.artistSongs.map((as) => ({
        artistId: as.artistId,
        name: as.artist.name,
        nameKo: as.artist.nameKo,
        role: as.role ?? undefined,
        slug: as.artist.slug ?? undefined,
      })),
      tjSong: song.tjSong
        ? {
            id: song.tjSong.id,
            title: song.tjSong.title,
            artist: song.tjSong.artist ?? undefined,
            lyricist: song.tjSong.lyricist ?? undefined,
            composer: song.tjSong.composer ?? undefined,
            publishdate: song.tjSong.publishdate ?? undefined,
            isMR: song.tjSong.isMR,
            isMV: song.tjSong.isMV,
            isOver60: song.tjSong.isOver60,
          }
        : undefined,
      thumbnailDefault: song.thumbnailDefault ?? undefined,
      thumbnailMedium: song.thumbnailMedium ?? undefined,
      thumbnailHigh: song.thumbnailHigh ?? undefined,
      spotify: spotifyTrack
        ? {
            spotifyId: spotifyTrack.spotifyId,
            name: spotifyTrack.name,
            thumbnails: spotifyTrack.thumbnails,
          }
        : undefined,
      youtube: youtubeVideo
        ? {
            videoId: youtubeVideo.videoId,
            title: youtubeVideo.title ?? undefined,
            viewCount: youtubeVideo.viewCount
              ? Number(youtubeVideo.viewCount)
              : undefined,
            publishedYear: youtubeVideo.publishedAt
              ? youtubeVideo.publishedAt.getFullYear()
              : undefined,
            thumbnailDefault: youtubeVideo.thumbnailDefault ?? undefined,
            thumbnailMedium: youtubeVideo.thumbnailMedium ?? undefined,
            thumbnailHigh: youtubeVideo.thumbnailHigh ?? undefined,
          }
        : undefined,
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

  async findByArtistId(
    artistId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ songs: SongDto[]; total: number }> {
    const skip = (page - 1) * limit;
    const whereClause = {
      artistSongs: {
        some: {
          artistId,
        },
      },
    };

    const total = await this.prisma.song.count({ where: whereClause });

    if (total === 0) {
      return { songs: [], total };
    }

    const songs = await this.prisma.song.findMany({
      where: whereClause,
      select: this.songDtoSelect,
      orderBy: [
        { score: "desc" },
        { id: "asc" },
      ],
      skip,
      take: limit,
    });

    return {
      songs: songs.map((song) => this.mapToDto(song)),
      total,
    };
  }
}
