import { Injectable } from "@nestjs/common";
import { Provider } from "@prisma/client";
import { ArtistDto, KaraokeSongDto, SongDto } from "../dto";
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
  artistSongs: { artistId: number; role: string | null }[];
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
  constructor(private readonly prisma: PrismaService) {}

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
        role: artistSong.role ?? undefined,
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
        alias: true,
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
        const normalizedAlias = artist.alias
          ? normalizeForMatching(artist.alias)
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

        if (normalizedAlias && includesMatch(normalizedName, normalizedAlias)) {
          return true;
        }

        return false;
      })
      .map((artist) => ({
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        alias: artist.alias ?? undefined,
        homeCatalog: artist.homeCatalog ?? undefined,
        thumbnailDefault: artist.thumbnailDefault ?? undefined,
        thumbnailMedium: artist.thumbnailMedium ?? undefined,
        thumbnailHigh: artist.thumbnailHigh ?? undefined,
        tjSongRequestUrl: artist.tjSongRequestUrl ?? undefined,
      }));
  }
}
