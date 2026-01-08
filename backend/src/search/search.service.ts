import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Provider } from "@prisma/client";
import { ArtistDetailsDto, ArtistDto, KaraokeSongDto, SongDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";
import { TypesenseService } from "../typesense/typesense.service";
import { SearchResultDto } from "./dto/search-response.dto";

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

const SONG_SEARCH_SELECT = {
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
} as const;

const normalizeForMatching = (value: string): string =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

const includesMatch = (target: string, candidate: string): boolean => {
  if (!target || !candidate) {
    return false;
  }
  return candidate.includes(target);
};

@Injectable()
export class SearchService {
  private readonly useTypesense: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly typesenseService: TypesenseService,
    private readonly configService: ConfigService,
  ) {
    this.useTypesense =
      this.configService.get<string>("TYPESENSE_ENABLED", "true") === "true";
  }

  private filterSongsByTitleMatch<
    T extends { title: string; titleKo?: string | null },
  >(songs: T[], normalizedTitle: string): T[] {
    return songs.filter((song) => {
      const normalizedSongTitle = normalizeForMatching(song.title);
      const normalizedSongTitleKo = song.titleKo
        ? normalizeForMatching(song.titleKo)
        : "";

      if (includesMatch(normalizedTitle, normalizedSongTitle)) {
        return true;
      }

      if (
        normalizedSongTitleKo &&
        includesMatch(normalizedTitle, normalizedSongTitleKo)
      ) {
        return true;
      }
      return false;
    });
  }

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

  private mapSongToDto(song: SongWithRelations, tjSongMap: TjSongMap): SongDto {
    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo ?? undefined,
      catalog: song.catalog ?? undefined,
      artists: song.artistSongs.map((artistSong) => ({
        artistId: artistSong.artistId,
        name: artistSong.artist.name,
        nameKo: artistSong.artist.nameKo,
        role: artistSong.role ?? undefined,
        slug: artistSong.artist.slug ?? undefined,
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

  private async findSongsByNormalizedTitle(
    normalizedTitle: string,
  ): Promise<SongDto[]> {
    const songs = await this.prisma.song.findMany({
      select: SONG_SEARCH_SELECT,
      orderBy: { id: "asc" },
    });

    const matchedSongs = this.filterSongsByTitleMatch(songs, normalizedTitle);

    if (!matchedSongs.length) {
      return [];
    }

    const tjSongMap = await this.buildTjSongMap(matchedSongs);
    return matchedSongs.map((song) => this.mapSongToDto(song, tjSongMap));
  }

  // 제목과 아티스트 이름으로 곡 검색
  async searchSongsByTitleAndArtistName(query: {
    title: string;
    authorName: string;
  }): Promise<SongDto[]> {
    const normalizedTitle = normalizeForMatching(query.title);

    if (!normalizedTitle) {
      return [];
    }

    return this.findSongsByNormalizedTitle(normalizedTitle);
  }

  async searchSongsByTitle(query: { title: string }): Promise<SongDto[]> {
    const normalizedTitle = normalizeForMatching(query.title);

    if (!normalizedTitle) {
      return [];
    }

    return this.findSongsByNormalizedTitle(normalizedTitle);
  }

  async searchArtistsByArtistName(query: {
    name: string;
  }): Promise<ArtistDto[]> {
    const normalizedName = normalizeForMatching(query.name);

    if (!normalizedName) {
      return [];
    }

    const trimmedQuery = query.name.trim();

    const artists = await this.prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjSongRequestUrl: true,
      },
      where: trimmedQuery
        ? {
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" } },
              { nameKo: { contains: trimmedQuery, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ id: "desc" }],
    });
    return artists
      .filter((artist) => {
        const normalizedArtistName = normalizeForMatching(artist.name);
        const normalizedArtistNameKo = artist.nameKo
          ? normalizeForMatching(artist.nameKo)
          : "";
        const normalizedSlug = artist.slug
          ? normalizeForMatching(artist.slug)
          : "";

        if (includesMatch(normalizedName, normalizedArtistName)) {
          return true;
        }

        if (
          normalizedArtistNameKo &&
          includesMatch(normalizedName, normalizedArtistNameKo)
        ) {
          return true;
        }

        if (normalizedSlug && includesMatch(normalizedName, normalizedSlug)) {
          return true;
        }

        return false;
      })
      .map((artist) => ({
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        slug: artist.slug ?? undefined,
        homeCatalog: artist.homeCatalog ?? undefined,
        thumbnailDefault: artist.thumbnailDefault ?? undefined,
        thumbnailMedium: artist.thumbnailMedium ?? undefined,
        thumbnailHigh: artist.thumbnailHigh ?? undefined,
        tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
      }));
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

    // Typesense 사용 여부에 따라 분기
    if (this.useTypesense) {
      return this.searchUnifiedWithTypesense(trimmedQuery, page, limit);
    }

    return this.searchUnifiedWithPrisma(trimmedQuery, page, limit);
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
    const artistIds = artistsResponse.hits?.map((hit) =>
      parseInt(hit.document.id, 10),
    ) ?? [];
    const songIds = songsResponse.hits?.map((hit) =>
      parseInt(hit.document.id, 10),
    ) ?? [];

    // DB에서 상세 정보 조회 (병렬)
    const [artists, songs] = await Promise.all([
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
        : [],
      songIds.length > 0
        ? this.prisma.song.findMany({
            where: { id: { in: songIds } },
            select: SONG_SEARCH_SELECT,
          })
        : [],
    ]);

    // ID 순서 맵 생성 (Typesense 결과 순서 유지)
    const artistOrderMap = new Map(artistIds.map((id, index) => [id, index]));
    const songOrderMap = new Map(songIds.map((id, index) => [id, index]));

    // 순서대로 정렬
    const sortedArtists = artists.sort(
      (a, b) => (artistOrderMap.get(a.id) ?? 0) - (artistOrderMap.get(b.id) ?? 0),
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
        nameKo: artist.nameKo,
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

    // 곡 결과 매핑
    const tjSongMap = await this.buildTjSongMap(sortedSongs);
    const songResults: SearchResultDto[] = sortedSongs.map((song) => ({
      type: "song" as const,
      song: this.mapSongToDto(song, tjSongMap),
    }));

    // 아티스트 우선, 그 다음 곡
    const allResults = [...artistResults, ...songResults];
    const total = allResults.length;

    // 페이지네이션 적용
    const skip = (page - 1) * limit;
    const paginatedResults = allResults.slice(skip, skip + limit);

    return { results: paginatedResults, total };
  }

  // Prisma 기반 통합 검색 (기존 로직)
  private async searchUnifiedWithPrisma(
    query: string,
    page: number,
    limit: number,
  ): Promise<{ results: SearchResultDto[]; total: number }> {
    const normalizedQuery = normalizeForMatching(query);
    const skip = (page - 1) * limit;

    // 아티스트 검색
    const artists = await this.prisma.artist.findMany({
      where: {
        OR: [
          { name: { contains: trimmedQuery, mode: "insensitive" } },
          { nameKo: { contains: trimmedQuery, mode: "insensitive" } },
        ],
      },
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
      orderBy: { id: "desc" },
    });

    // 곡 검색
    const songs = await this.prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: trimmedQuery, mode: "insensitive" } },
          { titleKo: { contains: trimmedQuery, mode: "insensitive" } },
        ],
      },
      select: SONG_SEARCH_SELECT,
      orderBy: { id: "desc" },
    });

    // 아티스트 필터링 (정규화 매칭)
    const filteredArtists = artists.filter((artist) => {
      const normalizedName = normalizeForMatching(artist.name);
      const normalizedNameKo = artist.nameKo
        ? normalizeForMatching(artist.nameKo)
        : "";

      return (
        includesMatch(normalizedQuery, normalizedName) ||
        includesMatch(normalizedQuery, normalizedNameKo)
      );
    });

    // 곡 필터링 (정규화 매칭)
    const filteredSongs = this.filterSongsByTitleMatch(songs, normalizedQuery);

    // 아티스트 결과 매핑
    const artistResults: SearchResultDto[] = filteredArtists.map(
      (artist) => {
        const mainChannel =
          artist.youtubeChannels.find((ch) => ch.type === "MAIN") ??
          artist.youtubeChannels.find((ch) => ch.type === "TOPIC");

        const artistDetails: ArtistDetailsDto = {
          id: artist.id,
          name: artist.name,
          nameKo: artist.nameKo,
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
      },
    );

    // 곡 결과 매핑
    const tjSongMap = await this.buildTjSongMap(filteredSongs);
    const songResults: SearchResultDto[] = filteredSongs.map((song) => ({
      type: "song" as const,
      song: this.mapSongToDto(song, tjSongMap),
    }));

    // 아티스트 우선, 그 다음 곡
    const allResults = [...artistResults, ...songResults];
    const total = allResults.length;

    // 페이지네이션 적용
    const paginatedResults = allResults.slice(skip, skip + limit);

    return { results: paginatedResults, total };
  }
}
