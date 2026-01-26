import { Injectable, Logger } from "@nestjs/common";
import { ArtistDetailsDto, SongDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";
import { TypesenseService } from "../typesense/typesense.service";
import { SearchResultDto } from "./dto/search-response.dto";
import { SearchSuggestionCardDto } from "./dto/search-suggestions-response.dto";
import { sanitizeSearchText } from "./utils/sanitize-query.util";
import { fetchSpotifyOembed } from "../thirdparty/spotify/oembed";
import { fetchYoutubeOembed } from "../thirdparty/youtube/oembed";

type SongWithRelations = {
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
  songProposes: {
    songSinger: string;
    songTitle: string;
    content: string;
    name: string;
    hit: number;
    saveDate: bigint;
  }[];
};

type ArtistWithDetails = {
  id: number;
  name: string;
  nameKo: string | null;
  slug: string | null;
  homeCatalog: string | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  youtubeChannels: {
    type: string;
    channelId: string;
    title: string | null;
    description: string | null;
    customUrl: string | null;
    subscriberCount: number | null;
    videoCount: number | null;
    thumbnailDefault: string | null;
    thumbnailMedium: string | null;
    thumbnailHigh: string | null;
  }[];
  _count: {
    artistSongs: number;
  };
};

const SONG_SEARCH_SELECT = {
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
        gte: BigInt(Date.now() - 90 * 24 * 60 * 60 * 1000),
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
} as const;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly typesenseService: TypesenseService,
  ) {}

  private mapSongToDto(song: SongWithRelations): SongDto {
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
      artists: song.artistSongs.map((artistSong) => ({
        artistId: artistSong.artistId,
        name: artistSong.artist.name,
        nameKo: artistSong.artist.nameKo,
        role: artistSong.role ?? undefined,
        slug: artistSong.artist.slug ?? undefined,
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

  // 제목과 아티스트 이름으로 곡 검색 (Typesense 기반)
  async searchSongsByTitleAndArtistName(query: {
    title: string;
    authorName?: string;
  }): Promise<SongDto[]> {
    const sanitizedTitle = sanitizeSearchText(query.title);
    const sanitizedAuthorName = sanitizeSearchText(query.authorName);
    const typesenseQuery = [sanitizedTitle, sanitizedAuthorName]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!typesenseQuery) {
      this.logger.warn(
        `searchSongsByTitleAndArtistName received empty query (title="${sanitizedTitle}", author="${sanitizedAuthorName}")`,
      );
      return [];
    }

    const songsResponse = await this.typesenseService.searchSongs({
      query: typesenseQuery,
      page: 1,
      perPage: 20,
    });
    // this.logger.log(
    //   `Typesense song search query="${typesenseQuery}" hits=${songsResponse.hits?.length ?? 0}`,
    // );

    const songIds = Array.from(
      new Set(
        songsResponse.hits
          ?.map((hit) => parseInt(hit.document.id, 10))
          .filter((id) => !Number.isNaN(id)) ?? [],
      ),
    );

    if (!songIds.length) {
      return [];
    }

    const songs = await this.prisma.song.findMany({
      where: { id: { in: songIds } },
      select: SONG_SEARCH_SELECT,
    });

    if (!songs.length) {
      return [];
    }

    const songOrderMap = new Map(songIds.map((id, index) => [id, index]));
    // artist도 없고 tjSong도 없는 곡은 제외
    const sortedSongs = songs
      .filter((song) => song.artistSongs.length > 0 || !!song.tjSong)
      .sort(
        (a, b) => (songOrderMap.get(a.id) ?? 0) - (songOrderMap.get(b.id) ?? 0),
      );

    return sortedSongs.map((song) => this.mapSongToDto(song));
  }

  // 통합 검색 (아티스트 + 곡)
  async searchUnified(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ results: SearchResultDto[]; total: number }> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { results: [], total: 0 };
    }

    const sanitizedQuery = sanitizeSearchText(trimmedQuery) || trimmedQuery;

    return this.searchUnifiedWithTypesense(sanitizedQuery, page, limit);
  }

  // Typesense 기반 통합 검색
  private async searchUnifiedWithTypesense(
    query: string,
    page: number,
    limit: number,
  ): Promise<{ results: SearchResultDto[]; total: number }> {
    // Typesense에서 아티스트와 곡 병렬 검색
    const [artistsResponse, songsResponse] = await Promise.all([
      this.typesenseService.searchArtists({
        query,
        page: 1,
        perPage: 100, // 충분히 가져옴
      }),
      this.typesenseService.searchSongs({
        query,
        page: 1,
        perPage: 100,
      }),
    ]);

    // Typesense 결과에서 ID 추출
    const artistIds =
      artistsResponse.hits?.map((hit) => parseInt(hit.document.id, 10)) ?? [];
    const songIds =
      songsResponse.hits?.map((hit) => parseInt(hit.document.id, 10)) ?? [];

    // DB에서 상세 정보 조회 (병렬)
    const artistsPromise: Promise<ArtistWithDetails[]> =
      artistIds.length > 0
        ? this.prisma.artist.findMany({
            where: { id: { in: artistIds } },
            select: {
              id: true,
              name: true,
              nameKo: true,
              slug: true,
              homeCatalog: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
              youtubeChannels: {
                select: {
                  type: true,
                  channelId: true,
                  title: true,
                  description: true,
                  customUrl: true,
                  subscriberCount: true,
                  videoCount: true,
                  thumbnailDefault: true,
                  thumbnailMedium: true,
                  thumbnailHigh: true,
                },
              },
              _count: {
                select: {
                  artistSongs: true,
                },
              },
            },
          })
        : Promise.resolve<ArtistWithDetails[]>([]);

    const songsPromise: Promise<SongWithRelations[]> =
      songIds.length > 0
        ? this.prisma.song.findMany({
            where: { id: { in: songIds } },
            select: SONG_SEARCH_SELECT,
          })
        : Promise.resolve<SongWithRelations[]>([]);

    const [artists, songs] = await Promise.all([artistsPromise, songsPromise]);

    // ID 순서 맵 생성 (Typesense 결과 순서 유지)
    const artistOrderMap = new Map(artistIds.map((id, index) => [id, index]));
    const songOrderMap = new Map(songIds.map((id, index) => [id, index]));

    // 순서대로 정렬
    const sortedArtists = artists.sort(
      (a, b) =>
        (artistOrderMap.get(a.id) ?? 0) - (artistOrderMap.get(b.id) ?? 0),
    );
    const sortedSongs = songs.sort(
      (a, b) => (songOrderMap.get(a.id) ?? 0) - (songOrderMap.get(b.id) ?? 0),
    );

    // 아티스트 결과 매핑
    const artistResults: SearchResultDto[] = sortedArtists.map((artist) => {
      const mainChannel =
        artist.youtubeChannels.find((ch) => ch.type === "MAIN") ??
        artist.youtubeChannels.find((ch) => ch.type === "TOPIC");

      const artistDetails: ArtistDetailsDto = {
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo ?? artist.name,
        slug: artist.slug ?? undefined,
        homeCatalog: artist.homeCatalog ?? undefined,
        thumbnailDefault: artist.thumbnailDefault ?? undefined,
        thumbnailMedium: artist.thumbnailMedium ?? undefined,
        thumbnailHigh: artist.thumbnailHigh ?? undefined,
        songCount: artist._count.artistSongs,
        youtube: mainChannel
          ? {
              channelId: mainChannel.channelId,
              title: mainChannel.title ?? undefined,
              description: mainChannel.description ?? undefined,
              customUrl: mainChannel.customUrl ?? undefined,
              subscriberCount: mainChannel.subscriberCount ?? undefined,
              videoCount: mainChannel.videoCount ?? undefined,
              thumbnailDefault: mainChannel.thumbnailDefault ?? undefined,
              thumbnailMedium: mainChannel.thumbnailMedium ?? undefined,
              thumbnailHigh: mainChannel.thumbnailHigh ?? undefined,
            }
          : undefined,
      };

      return {
        type: "artist" as const,
        artist: artistDetails,
      };
    });

    // 곡 결과 매핑 (artist도 없고 tjSong도 없는 곡은 제외)
    const songResults: SearchResultDto[] = sortedSongs
      .filter((song) => song.artistSongs.length > 0 || !!song.tjSong)
      .map((song) => ({
        type: "song" as const,
        song: this.mapSongToDto(song),
      }));

    // 아티스트 우선, 그 다음 곡
    const allResults = [...artistResults, ...songResults];
    const total = allResults.length;

    // 페이지네이션 적용
    const skip = (page - 1) * limit;
    const paginatedResults = allResults.slice(skip, skip + limit);

    return { results: paginatedResults, total };
  }

  // 자동완성 검색
  async getAutocomplete(query?: string): Promise<SearchSuggestionCardDto[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const trimmedQuery = query.trim();
    const sanitizedQuery = sanitizeSearchText(trimmedQuery) || trimmedQuery;

    // Typesense에서 아티스트와 곡 검색 (상위 5개씩)
    const [artistsResponse, songsResponse] = await Promise.all([
      this.typesenseService.searchArtists({
        query: sanitizedQuery,
        page: 1,
        perPage: 5,
      }),
      this.typesenseService.searchSongs({
        query: sanitizedQuery,
        page: 1,
        perPage: 5,
      }),
    ]);

    // Typesense 결과에서 ID 추출
    const artistIds =
      artistsResponse.hits?.map((hit) => parseInt(hit.document.id, 10)) ?? [];
    const songIds =
      songsResponse.hits?.map((hit) => parseInt(hit.document.id, 10)) ?? [];

    // DB에서 상세 정보 조회
    type AutocompleteArtist = {
      id: number;
      name: string;
      nameKo: string | null;
      slug: string | null;
      thumbnailDefault: string | null;
      thumbnailMedium: string | null;
      thumbnailHigh: string | null;
    };

    const [artists, songs] = await Promise.all([
      artistIds.length > 0
        ? this.prisma.artist.findMany({
            where: { id: { in: artistIds } },
            select: {
              id: true,
              name: true,
              nameKo: true,
              slug: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
            },
          })
        : Promise.resolve<AutocompleteArtist[]>([]),
      songIds.length > 0
        ? this.prisma.song.findMany({
            where: { id: { in: songIds } },
            select: SONG_SEARCH_SELECT,
          })
        : Promise.resolve<SongWithRelations[]>([]),
    ]);

    // ID 순서 맵 생성 (Typesense 결과 순서 유지)
    const artistOrderMap = new Map(artistIds.map((id, index) => [id, index]));
    const songOrderMap = new Map(songIds.map((id, index) => [id, index]));

    // 순서대로 정렬
    const sortedArtists = artists.sort(
      (a, b) =>
        (artistOrderMap.get(a.id) ?? 0) - (artistOrderMap.get(b.id) ?? 0),
    );
    const sortedSongs = songs.sort(
      (a, b) => (songOrderMap.get(a.id) ?? 0) - (songOrderMap.get(b.id) ?? 0),
    );

    // 결과를 SearchSuggestionCardDto 형식으로 변환
    const cards: SearchSuggestionCardDto[] = [];

    // 아티스트 카드 추가
    for (const artist of sortedArtists) {
      cards.push({
        artist: {
          id: artist.id,
          slug: artist.slug ?? undefined,
          title: artist.name,
          titleKo: artist.nameKo ?? undefined,
          thumbnail:
            artist.thumbnailMedium ?? artist.thumbnailDefault ?? undefined,
        },
      });
    }

    // 곡 카드 추가 (artist도 없고 tjSong도 없는 곡은 제외)
    for (const song of sortedSongs) {
      const hasArtists = song.artistSongs.length > 0;
      const hasTjSong = !!song.tjSong;

      // artist도 없고 tjSong도 없으면 표시하지 않음
      if (!hasArtists && !hasTjSong) {
        continue;
      }

      const primaryArtist = song.artistSongs[0]?.artist;
      // artists가 있으면 artist 이름 사용, 없으면 tjSong.artist 사용
      const artistNames = hasArtists
        ? song.artistSongs.map((as) => as.artist.name).join(", ")
        : song.tjSong?.artist ?? "";
      // artists가 있고 slug가 있는 경우에만 artistSlug 반환
      const artistSlug = hasArtists ? (primaryArtist?.slug ?? undefined) : undefined;
      const bestPropose = song.songProposes[0];
      cards.push({
        song: {
          id: song.id,
          title: song.title,
          titleKo: song.titleKo ?? undefined,
          titleJa: song.titleJa ?? undefined,
          titleLatin: song.titleLatin ?? undefined,
          artistName: artistNames || "Unknown",
          artistSlug,
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
          thumbnail: song.thumbnailMedium ?? song.thumbnailDefault ?? undefined,
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
        },
      });
    }

    return cards;
  }

  async findSongByMusicLink(url: string): Promise<{
    songs: SongDto[];
    matchedByExactId: boolean;
  }> {
    const videoId = this.extractYoutubeVideoId(url);
    const spotifyId = this.extractSpotifyTrackId(url);

    // 1) YouTube videoId로 DB 먼저 스캔
    if (videoId) {
      const mappings = await this.prisma.songYoutubeVideo.findMany({
        where: { youtubeVideoId: videoId },
        select: {
          song: {
            select: SONG_SEARCH_SELECT,
          },
        },
      });

      if (mappings.length > 0) {
        // artist도 없고 tjSong도 없는 곡은 제외
        const songs = mappings
          .map((m) => m.song)
          .filter((song) => song.artistSongs.length > 0 || !!song.tjSong);
        this.logger.log(`YouTube DB 발견: ${videoId}, ${songs.length}개`);
        return {
          songs: songs.map((song) => this.mapSongToDto(song)),
          matchedByExactId: true,
        };
      }
    }

    // 2) Spotify trackId로 DB 스캔
    if (spotifyId) {
      const spotifyTrack = await this.prisma.spotifyTrack.findUnique({
        where: { spotifyId },
        select: {
          songs: {
            select: {
              song: {
                select: SONG_SEARCH_SELECT,
              },
            },
          },
        },
      });

      if (spotifyTrack && spotifyTrack.songs.length > 0) {
        // artist도 없고 tjSong도 없는 곡은 제외
        const songs = spotifyTrack.songs
          .map((m) => m.song)
          .filter((song) => song.artistSongs.length > 0 || !!song.tjSong);
        this.logger.log(`Spotify DB 발견: ${spotifyId}, ${songs.length}개`);
        return {
          songs: songs.map((song) => this.mapSongToDto(song)),
          matchedByExactId: true,
        };
      }
    }

    // 3) DB에 없으면 oEmbed → title로 Typesense 검색
    let title: string;
    let authorName: string | undefined;

    if (spotifyId || this.isSpotifyUrl(url)) {
      const spotify = await fetchSpotifyOembed(url);
      // Spotify oEmbed title은 "트랙명 - 아티스트명" 형식
      title = spotify.title;
      authorName = undefined; // title에 포함되어 있음
    } else {
      const youtube = await fetchYoutubeOembed(url);
      title = youtube.title;
      authorName = youtube.author_name;
    }

    const cleanTitle = title
      .replace(/\s+/g, "")
      .replace(/[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?`~\-😀-🙏]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    const cleanAuthor = authorName
      ?.replace(/\s+/g, "")
      .replace(/[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?`~\-😀-🙏]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

    const songs = await this.searchSongsByTitleAndArtistName({
      title: cleanTitle,
      authorName: cleanAuthor,
    });
    return { songs, matchedByExactId: false };
  }

  private extractYoutubeVideoId(input: string): string | null {
    try {
      const u = new URL(input);

      // youtu.be/<id>
      if (u.hostname === "youtu.be") {
        const id = u.pathname.replace("/", "").trim();
        return id ? id : null;
      }

      // youtube.com 또는 music.youtube.com
      if (u.hostname.includes("youtube.com")) {
        // watch?v=<id>
        const v = u.searchParams.get("v");
        if (v) return v;

        // /shorts/<id> or /embed/<id>
        const m = u.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]{6,})/);
        if (m?.[2]) return m[2];
      }

      return null;
    } catch {
      return null;
    }
  }

  private extractSpotifyTrackId(input: string): string | null {
    try {
      const u = new URL(input);

      if (!u.hostname.includes("spotify.com")) {
        return null;
      }

      // /track/<id> 형식
      const m = u.pathname.match(/\/track\/([a-zA-Z0-9]+)/);
      if (m?.[1]) return m[1];

      return null;
    } catch {
      return null;
    }
  }

  private isSpotifyUrl(input: string): boolean {
    try {
      const u = new URL(input);
      return u.hostname.includes("spotify.com");
    } catch {
      return false;
    }
  }

  async saveSearchHistory(
    userId: number,
    query?: string,
    url?: string,
  ): Promise<void> {
    await this.prisma.searchHistory.create({
      data: {
        userId,
        query: query?.trim(),
        url: url?.trim(),
      },
    });
  }

  async saveSearchClick(
    userId: number,
    query?: string,
    url?: string,
    artistId?: number,
    songId?: number,
    source?: string,
  ): Promise<void> {
    await this.prisma.searchClick.create({
      data: {
        userId,
        query: query?.trim(),
        url: url?.trim(),
        artistId,
        songId,
        source: source?.trim(),
      },
    });
  }

  async getRecentSearches(userId: number, limit: number = 5): Promise<string[]> {
    const histories = await this.prisma.searchHistory.findMany({
      where: {
        userId,
        query: { not: null },
      },
      orderBy: { searchedAt: "desc" },
      select: { query: true },
      distinct: ["query"],
      take: limit,
    });

    return histories
      .map((h) => h.query)
      .filter((q): q is string => q !== null);
  }

  async getPopularSearches(limit: number = 5): Promise<string[]> {
    const results = await this.prisma.searchHistory.groupBy({
      by: ["query"],
      where: {
        query: { not: null },
      },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: limit,
    });

    return results
      .map((r) => r.query)
      .filter((q): q is string => q !== null);
  }
}
