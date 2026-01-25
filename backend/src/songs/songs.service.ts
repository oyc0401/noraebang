import { Injectable } from "@nestjs/common";
import { SongDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";

export const SONG_SORT_OPTIONS = [
  "recent",
  "popular",
  "tj_recommend",
] as const;

export type SongSortOption = (typeof SONG_SORT_OPTIONS)[number];
export const DEFAULT_SONG_SORT: SongSortOption = "recent";

type SongProposeData = {
  songSinger: string;
  songTitle: string;
  content: string;
  name: string;
  hit: number;
  saveDate: bigint;
};

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
  songProposes: SongProposeData[];
};

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  private get songDtoSelect() {
    const threeMonthsAgo = BigInt(Date.now() - 90 * 24 * 60 * 60 * 1000);

    return {
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
      songProposes: {
        where: {
          saveDate: {
            gte: threeMonthsAgo,
          },
        },
        orderBy: {
          hit: "desc" as const,
        },
        take: 1,
        select: {
          songSinger: true,
          songTitle: true,
          content: true,
          name: true,
          hit: true,
          saveDate: true,
        },
      },
    };
  }

  private mapToDto(song: SongDtoData): SongDto {
    const spotifyTrack = song.songSpotifyTracks[0]?.spotifyTrack;
    const youtubeVideo = song.youtubeVideos[0]?.youtubeVideo;
    const bestPropose = song.songProposes[0];

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
      bestSongPropose: bestPropose
        ? {
            songSinger: bestPropose.songSinger,
            songTitle: bestPropose.songTitle,
            content: bestPropose.content,
            name: bestPropose.name,
            hit: bestPropose.hit,
            saveDate: Number(bestPropose.saveDate),
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

  /**
   * 정렬 옵션에 따라 곡 목록 조회
   * - recent: TJ 발매일자가 최근인 곡
   * - popular: SearchClick이 가장 많은 곡
   * - tj_recommend: SongPropose hit수가 가장 많고, 3개월 이내 생성된 곡
   */
  async findBySort(
    sort: SongSortOption,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ songs: SongDto[]; total: number }> {
    const skip = (page - 1) * limit;

    switch (sort) {
      case "recent":
        return this.findRecent(skip, limit);
      case "popular":
        return this.findPopular(skip, limit);
      case "tj_recommend":
        return this.findTjRecommend(skip, limit);
    }
  }

  /**
   * 최근에 나온 곡 (TJ 발매일자가 최근인 곡)
   * slug가 있는 아티스트의 곡만 포함
   */
  private async findRecent(
    skip: number,
    limit: number,
  ): Promise<{ songs: SongDto[]; total: number }> {
    const whereClause = {
      tjSong: {
        publishdate: { not: null },
      },
      artistSongs: {
        some: {
          artist: {
            slug: { not: null },
          },
        },
      },
    };

    const total = await this.prisma.song.count({ where: whereClause });

    const songs = await this.prisma.song.findMany({
      where: whereClause,
      select: this.songDtoSelect,
      orderBy: [
        { tjSong: { publishdate: "desc" } },
        { id: "desc" },
      ],
      skip,
      take: limit,
    });

    return {
      songs: songs.map((song) => this.mapToDto(song)),
      total,
    };
  }

  /**
   * 인기있는 곡 (SearchClick이 가장 많은 노래순)
   * slug가 있는 아티스트의 곡만 포함
   */
  private async findPopular(
    skip: number,
    limit: number,
  ): Promise<{ songs: SongDto[]; total: number }> {
    // slug가 있는 아티스트의 곡 ID 목록
    const songsWithSlugArtist = await this.prisma.song.findMany({
      where: {
        artistSongs: {
          some: {
            artist: {
              slug: { not: null },
            },
          },
        },
      },
      select: { id: true },
    });
    const validSongIds = new Set(songsWithSlugArtist.map((s) => s.id));

    // SearchClick에서 songId별로 클릭 수 집계
    const clickCounts = await this.prisma.searchClick.groupBy({
      by: ["songId"],
      where: { songId: { not: null } },
      _count: { songId: true },
      orderBy: { _count: { songId: "desc" } },
    });

    // slug 있는 아티스트의 곡만 필터링
    const filteredClicks = clickCounts.filter(
      (c) => c.songId !== null && validSongIds.has(c.songId),
    );

    const total = filteredClicks.length;
    const paginatedClicks = filteredClicks.slice(skip, skip + limit);
    const songIds = paginatedClicks
      .map((c) => c.songId)
      .filter((id): id is number => id !== null);

    if (songIds.length === 0) {
      return { songs: [], total };
    }

    const songs = await this.prisma.song.findMany({
      where: { id: { in: songIds } },
      select: this.songDtoSelect,
    });

    // 원래 순서대로 정렬
    const songMap = new Map(songs.map((s) => [s.id, s]));
    const orderedSongs = songIds
      .map((id) => songMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    return {
      songs: orderedSongs.map((song) => this.mapToDto(song)),
      total,
    };
  }

  /**
   * TJ 추천수 많은순 (SongPropose hit수가 가장 많고, 3개월 이내 생성된 곡)
   * tjSong이 없고, slug가 있는 아티스트의 곡만 포함
   */
  private async findTjRecommend(
    skip: number,
    limit: number,
  ): Promise<{ songs: SongDto[]; total: number }> {
    const threeMonthsAgo = BigInt(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // 3개월 이내 SongPropose에서 songId별로 최대 hit 집계 (tjSong이 없고 slug 있는 아티스트의 곡만)
    const proposes = await this.prisma.songPropose.findMany({
      where: {
        songId: { not: null },
        saveDate: { gte: threeMonthsAgo },
        song: {
          tjSongId: null,
          artistSongs: {
            some: {
              artist: {
                slug: { not: null },
              },
            },
          },
        },
      },
      select: {
        songId: true,
        hit: true,
      },
      orderBy: { hit: "desc" },
    });

    // songId별로 최대 hit 집계
    const songHitMap = new Map<number, number>();
    for (const p of proposes) {
      if (p.songId === null) continue;
      const currentHit = songHitMap.get(p.songId) ?? 0;
      if (p.hit > currentHit) {
        songHitMap.set(p.songId, p.hit);
      }
    }

    // hit 순으로 정렬
    const sortedSongIds = Array.from(songHitMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([songId]) => songId);

    const total = sortedSongIds.length;
    const paginatedIds = sortedSongIds.slice(skip, skip + limit);

    if (paginatedIds.length === 0) {
      return { songs: [], total };
    }

    const songs = await this.prisma.song.findMany({
      where: { id: { in: paginatedIds } },
      select: this.songDtoSelect,
    });

    // 원래 순서대로 정렬
    const songMap = new Map(songs.map((s) => [s.id, s]));
    const orderedSongs = paginatedIds
      .map((id) => songMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    return {
      songs: orderedSongs.map((song) => this.mapToDto(song)),
      total,
    };
  }
}
