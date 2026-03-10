import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CacheService } from "../cache";
import { SongDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";

export const SONG_SORT_OPTIONS = [
  "recent",
  "popular",
  "tj_recommend",
] as const;

export type SongSortOption = (typeof SONG_SORT_OPTIONS)[number];
export const DEFAULT_SONG_SORT: SongSortOption = "recent";

type SortedIdsCache = {
  sortedSongIds: number[];
  total: number;
};

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
      artists: {
        spotifyArtist: {
          name: string;
        };
      }[];
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
      channels: {
        youtubeChannel: {
          title: string | null;
        };
      }[];
    };
  }[];
  songProposes: SongProposeData[];
};

@Injectable()
export class SongsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

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
              artists: {
                select: {
                  spotifyArtist: {
                    select: {
                      name: true,
                    },
                  },
                },
                take: 1,
              },
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
              channels: {
                select: {
                  youtubeChannel: {
                    select: {
                      title: true,
                    },
                  },
                },
                take: 1,
              },
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

  /**
   * 단일 곡 조회용 select (모든 연결 데이터 포함)
   */
  private get songDetailSelect() {
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
              artists: {
                select: {
                  spotifyArtist: {
                    select: {
                      name: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          spotifyTrack: {
            popularity: "desc" as const,
          },
        },
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
              channels: {
                select: {
                  youtubeChannel: {
                    select: {
                      title: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          youtubeVideo: {
            viewCount: "desc" as const,
          },
        },
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

  private mapToDto(song: SongDtoData, includeAllRelations = false): SongDto {
    const spotifyTrack = song.songSpotifyTracks[0]?.spotifyTrack;
    const youtubeVideo = song.youtubeVideos[0]?.youtubeVideo;
    const bestPropose = song.songProposes[0];

    const baseDto: SongDto = {
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
            popularity: spotifyTrack.popularity ?? undefined,
            artistName: spotifyTrack.artists[0]?.spotifyArtist.name,
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
            channelName: youtubeVideo.channels[0]?.youtubeChannel.title
              ?.replace(/ - Topic$/, "")
              ?? undefined,
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

    // 상세 조회 시 모든 연결 데이터 배열 포함
    if (includeAllRelations) {
      baseDto.spotifyTracks =
        song.songSpotifyTracks.length > 0
          ? song.songSpotifyTracks.map((st) => ({
              spotifyId: st.spotifyTrack.spotifyId,
              name: st.spotifyTrack.name,
              thumbnails: st.spotifyTrack.thumbnails,
              popularity: st.spotifyTrack.popularity ?? undefined,
              artistName: st.spotifyTrack.artists[0]?.spotifyArtist.name,
            }))
          : undefined;

      baseDto.youtubeVideos =
        song.youtubeVideos.length > 0
          ? song.youtubeVideos.map((yv) => ({
              videoId: yv.youtubeVideo.videoId,
              title: yv.youtubeVideo.title ?? undefined,
              viewCount: yv.youtubeVideo.viewCount
                ? Number(yv.youtubeVideo.viewCount)
                : undefined,
              publishedYear: yv.youtubeVideo.publishedAt
                ? yv.youtubeVideo.publishedAt.getFullYear()
                : undefined,
              thumbnailDefault: yv.youtubeVideo.thumbnailDefault ?? undefined,
              thumbnailMedium: yv.youtubeVideo.thumbnailMedium ?? undefined,
              thumbnailHigh: yv.youtubeVideo.thumbnailHigh ?? undefined,
              channelName: yv.youtubeVideo.channels[0]?.youtubeChannel.title
                ?.replace(/ - Topic$/, "")
                ?? undefined,
            }))
          : undefined;

      baseDto.songProposes =
        song.songProposes.length > 0
          ? song.songProposes.map((sp) => ({
              songSinger: sp.songSinger,
              songTitle: sp.songTitle,
              content: sp.content,
              name: sp.name,
              hit: sp.hit,
              saveDate: Number(sp.saveDate),
            }))
          : undefined;
    }

    return baseDto;
  }

  /**
   * songId 목록으로 SongDto 배열 조회 (순서 유지)
   */
  private async fetchSongsByIds(songIds: number[]): Promise<SongDto[]> {
    if (songIds.length === 0) return [];

    const songs = await this.prisma.song.findMany({
      where: { id: { in: songIds } },
      select: this.songDtoSelect,
    });

    const songMap = new Map(songs.map((s) => [s.id, s]));
    return songIds
      .map((id) => songMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined)
      .map((song) => this.mapToDto(song));
  }

  async findAll(): Promise<SongDto[]> {
    const songs = await this.prisma.song.findMany({
      select: this.songDtoSelect,
      orderBy: { id: "asc" },
    });

    // artist도 없고 tjSong도 없는 곡은 제외
    return songs
      .filter((song) => song.artistSongs.length > 0 || !!song.tjSong)
      .map((song) => this.mapToDto(song));
  }

  async findById(id: number): Promise<SongDto | null> {
    const song = await this.prisma.song.findUnique({
      where: { id },
      select: this.songDetailSelect,
    });

    if (!song) return null;

    // artist도 없고 tjSong도 없는 곡은 표시하지 않음
    if (song.artistSongs.length === 0 && !song.tjSong) {
      return null;
    }

    return this.mapToDto(song, true);
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

    // artist도 없고 tjSong도 없는 곡은 제외
    return songs
      .filter((song) => song.artistSongs.length > 0 || !!song.tjSong)
      .map((song) => this.mapToDto(song));
  }

  async findByArtistId(
    artistId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ songs: SongDto[]; total: number }> {
    const cacheKey = `${artistId}:${page}:${limit}`;
    const cached = this.cache.get<{ songs: SongDto[]; total: number }>(
      "songs:artist",
      cacheKey,
    );
    if (cached) return cached;

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
      const result = { songs: [], total };
      this.cache.set("songs:artist", cacheKey, result);
      return result;
    }

    const songs = await this.prisma.song.findMany({
      where: whereClause,
      select: this.songDtoSelect,
      orderBy: [{ score: "desc" }, { id: "asc" }],
      skip,
      take: limit,
    });

    const result = {
      songs: songs.map((song) => this.mapToDto(song)),
      total,
    };
    this.cache.set("songs:artist", cacheKey, result);
    return result;
  }

  /**
   * 정렬 옵션에 따라 곡 목록 조회 (캐싱 적용)
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
   * tjSong이 있는 곡 (artist 유무 상관없이), 캐싱 적용
   */
  private async findRecent(
    skip: number,
    limit: number,
  ): Promise<{ songs: SongDto[]; total: number }> {
    const cacheKey = "recent";

    // 캐시에서 정렬된 songId 목록 가져오기
    let cached = this.cache.get<SortedIdsCache>("songs:sort", cacheKey);

    if (!cached) {
      // Raw SQL로 정렬된 ID 목록 조회 (tjSong이 있으면 artist 없어도 OK)
      const results = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        SELECT s.id
        FROM song s
        INNER JOIN tj_song tj ON tj.id = s.tj_song_id
        WHERE tj.publishdate IS NOT NULL
          AND s.catalog = 'JPOP'
        ORDER BY tj.publishdate DESC, s.id DESC
      `);

      cached = {
        sortedSongIds: results.map((r) => r.id),
        total: results.length,
      };
      this.cache.set("songs:sort", cacheKey, cached);
    }

    const { sortedSongIds, total } = cached;
    const paginatedIds = sortedSongIds.slice(skip, skip + limit);

    return {
      songs: await this.fetchSongsByIds(paginatedIds),
      total,
    };
  }

  /**
   * 인기있는 곡 (SearchClick이 가장 많은 노래순)
   * artist가 있거나 tjSong이 있는 곡만 포함, 캐싱 적용
   */
  private async findPopular(
    skip: number,
    limit: number,
  ): Promise<{ songs: SongDto[]; total: number }> {
    const cacheKey = "popular";

    // 캐시에서 정렬된 songId 목록 가져오기
    let cached = this.cache.get<SortedIdsCache>("songs:sort", cacheKey);

    if (!cached) {
      // Raw SQL로 집계 + 정렬 (artist가 있거나 tjSong이 있는 곡)
      const results = await this.prisma.$queryRaw<
        { song_id: number; click_count: bigint }[]
      >(Prisma.sql`
        SELECT sc.song_id, COUNT(*) as click_count
        FROM search_click sc
        INNER JOIN song s ON s.id = sc.song_id
        WHERE sc.song_id IS NOT NULL
          AND (
            EXISTS (SELECT 1 FROM artist_song asng WHERE asng.song_id = s.id)
            OR s.tj_song_id IS NOT NULL
          )
        GROUP BY sc.song_id
        ORDER BY click_count DESC
      `);

      cached = {
        sortedSongIds: results.map((r) => r.song_id),
        total: results.length,
      };
      this.cache.set("songs:sort", cacheKey, cached);
    }

    const { sortedSongIds, total } = cached;
    const paginatedIds = sortedSongIds.slice(skip, skip + limit);

    return {
      songs: await this.fetchSongsByIds(paginatedIds),
      total,
    };
  }

  /**
   * TJ 추천수 많은순 (SongPropose hit수가 가장 많고, 3개월 이내 생성된 곡)
   * tjSong이 없고, artist가 있는 곡만 포함, 캐싱 적용
   */
  private async findTjRecommend(
    skip: number,
    limit: number,
  ): Promise<{ songs: SongDto[]; total: number }> {
    const cacheKey = "tj_recommend";

    // 캐시에서 정렬된 songId 목록 가져오기
    let cached = this.cache.get<SortedIdsCache>("songs:sort", cacheKey);

    if (!cached) {
      const threeMonthsAgo = BigInt(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Raw SQL로 집계 + 정렬 (tjSong 없고 artist 있는 곡, slug 조건 제거)
      const results = await this.prisma.$queryRaw<
        { song_id: number; max_hit: number }[]
      >(Prisma.sql`
        SELECT sp.song_id, MAX(sp.po_hit) as max_hit
        FROM song_propose sp
        INNER JOIN song s ON s.id = sp.song_id
        WHERE sp.song_id IS NOT NULL
          AND sp.save_date >= ${threeMonthsAgo}
          AND s.tj_song_id IS NULL
          AND EXISTS (SELECT 1 FROM artist_song asng WHERE asng.song_id = s.id)
        GROUP BY sp.song_id
        ORDER BY max_hit DESC
      `);

      cached = {
        sortedSongIds: results.map((r) => r.song_id),
        total: results.length,
      };
      this.cache.set("songs:sort", cacheKey, cached);
    }

    const { sortedSongIds, total } = cached;
    const paginatedIds = sortedSongIds.slice(skip, skip + limit);

    return {
      songs: await this.fetchSongsByIds(paginatedIds),
      total,
    };
  }
}
