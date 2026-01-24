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
  tjSongId: string | null;
  karaokeSongs: { provider: Provider; karaokeNo: string }[];
  artistSongs: {
    artistId: number;
    role: string | null;
    artist: { name: string; nameKo: string; slug: string | null };
  }[];
  songSpotifyTracks: {
    spotifyTrack: {
      popularity: number | null;
      releaseDate: string | null;
    };
  }[];
};

type SongDtoData = {
  id: number;
  title: string;
  titleKo: string | null;
  titleJa: string | null;
  titleLatin: string | null;
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
    };
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
    titleJa: true,
    titleLatin: true,
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

  private async buildTjSongMap(
    songs: { karaokeSongs: { provider: Provider; karaokeNo: string }[] }[],
  ): Promise<TjSongMap> {
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

  private mapToDto(song: SongDtoData, tjSongMap: TjSongMap): SongDto {
    const spotifyTrack = song.songSpotifyTracks[0]?.spotifyTrack;
    const youtubeVideo = song.youtubeVideos[0]?.youtubeVideo;

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo ?? undefined,
      titleJa: song.titleJa ?? undefined,
      titleLatin: song.titleLatin ?? undefined,
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

    const tjSongMap = await this.buildTjSongMap(songs);
    return {
      songs: songs.map((song) => this.mapToDto(song, tjSongMap)),
      total,
    };
  }
}
