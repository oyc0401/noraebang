import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  type ArtistListQueryDto,
  type ArtistSortBy,
  type SortOrder,
} from "./dto/artist-list-query.dto";
import { ArtistListResponseDto } from "./dto/artist-list-response.dto";
import { ArtistSongsQueryDto } from "./dto/artist-songs-query.dto";
import {
  ArtistSongsResponseDto,
  SongSpotifyTrackDto,
  SongYoutubeVideoDto,
} from "./dto/artist-songs-response.dto";
import { DeleteSongResponseDto } from "./dto/delete-song-response.dto";
import { UpdateSongRequestDto } from "./dto/update-song-request.dto";
import { UpdateSongResponseDto } from "./dto/update-song-response.dto";
import {
  findSpotifyTrackInfos,
  findYoutubeVideoInfos,
  type SpotifyTrackInfo,
  type YoutubeVideoInfo,
} from "./media-lookup";

@Injectable()
export class SongService {
  constructor(private readonly prisma: PrismaService) {}

  async findArtists(query: ArtistListQueryDto): Promise<ArtistListResponseDto> {
    const limit = parseBoundedInteger(query.limit, 50, 1, 100);
    const offset = parseBoundedInteger(query.offset, 0, 0, 1_000_000);
    const sortBy = parseArtistSortBy(query.sortBy);
    const sortOrder = parseSortOrder(query.sortOrder, sortBy);
    const where = buildArtistWhere(query.search, query.hasSongsOnly === "true");

    const [artists, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        orderBy: [buildArtistOrderBy(sortBy, sortOrder), { id: "asc" }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          nameKo: true,
          nameJa: true,
          nameLatin: true,
          homeCatalog: true,
          thumbnailMedium: true,
          _count: { select: { artistSongs: true } },
        },
      }),
      this.prisma.artist.count({ where }),
    ]);

    const nextOffset = offset + artists.length;

    return {
      data: artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        nameJa: artist.nameJa ?? undefined,
        nameLatin: artist.nameLatin ?? undefined,
        homeCatalog: artist.homeCatalog ?? undefined,
        thumbnailMedium: artist.thumbnailMedium ?? undefined,
        songCount: artist._count.artistSongs,
      })),
      nextOffset,
      hasMore: nextOffset < total,
      total,
    };
  }

  async findArtistSongs(
    artistId: number,
    query: ArtistSongsQueryDto,
  ): Promise<ArtistSongsResponseDto> {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      throw new NotFoundException("artist not found.");
    }

    const artistSongs = await this.prisma.artistSong.findMany({
      where: {
        artistId,
        song: buildSongSearchWhere(query.search),
      },
      include: {
        song: {
          include: {
            youtubeVideos: { orderBy: { id: "asc" } },
            spotifyTracks: { orderBy: { id: "asc" } },
          },
        },
      },
      orderBy: { song: { title: "asc" } },
    });
    const songs = artistSongs.map((artistSong) => artistSong.song);

    // 조인 테이블엔 ID뿐이라 표시용 제목/썸네일을 media db에서 한 번에 붙인다.
    const youtubeVideoIds = unique(
      songs.flatMap((song) =>
        song.youtubeVideos.map((video) => video.youtubeVideoId),
      ),
    );
    const spotifyTrackIds = unique(
      songs.flatMap((song) =>
        song.spotifyTracks.map((track) => track.spotifyTrackId),
      ),
    );
    // media db가 죽어도 곡 목록 자체는 보여야 하므로 실패 시 ID만 노출한다.
    const [youtubeInfoById, spotifyInfoById] = await Promise.all([
      findYoutubeVideoInfos(youtubeVideoIds).catch(
        () => new Map<string, YoutubeVideoInfo>(),
      ),
      findSpotifyTrackInfos(spotifyTrackIds).catch(
        () => new Map<string, SpotifyTrackInfo>(),
      ),
    ]);

    return {
      artist: {
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        nameJa: artist.nameJa ?? undefined,
        nameJaKana: artist.nameJaKana ?? undefined,
        nameLatin: artist.nameLatin ?? undefined,
        tjName: artist.tjName ?? undefined,
        slug: artist.slug ?? undefined,
        homeCatalog: artist.homeCatalog ?? undefined,
        youtubeChannel: artist.youtube_channel ?? undefined,
        youtubeTopicChannel: artist.youtube_topic_channel ?? undefined,
        spotifyId: artist.spotifyId ?? undefined,
        thumbnailMedium: artist.thumbnailMedium ?? undefined,
      },
      data: songs.map((song) => ({
        id: song.id,
        title: song.title,
        titleKo: song.titleKo ?? undefined,
        titleJa: song.titleJa ?? undefined,
        titleJaPronu: song.titleJaPronu ?? undefined,
        titleJaKana: song.titleJaKana ?? undefined,
        titleJaKanji: song.titleJaKanji ?? undefined,
        titleLatin: song.titleLatin ?? undefined,
        titleLatinPronu: song.titleLatinPronu ?? undefined,
        catalog: song.catalog ?? undefined,
        tjSongId: song.tjSongId ?? undefined,
        visible: song.visible,
        score: song.score ?? undefined,
        thumbnailDefault: song.thumbnailDefault ?? undefined,
        thumbnailMedium: song.thumbnailMedium ?? undefined,
        thumbnailHigh: song.thumbnailHigh ?? undefined,
        youtubeVideos: song.youtubeVideos.map((video) =>
          toYoutubeVideoDto(video.youtubeVideoId, youtubeInfoById),
        ),
        spotifyTracks: song.spotifyTracks.map((track) =>
          toSpotifyTrackDto(track.spotifyTrackId, spotifyInfoById),
        ),
        createdAt: song.createdAt,
        updatedAt: song.updatedAt,
      })),
      total: songs.length,
    };
  }

  async updateSong(
    songId: number,
    body: UpdateSongRequestDto | undefined,
  ): Promise<UpdateSongResponseDto> {
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { id: true },
    });

    if (!song) {
      throw new NotFoundException("song not found.");
    }

    const data = buildSongUpdateData(body ?? {});
    const youtubeVideoIds = parseOptionalIdArray(body?.youtubeVideoIds);
    const spotifyTrackIds = parseOptionalIdArray(body?.spotifyTrackIds);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.song.update({ where: { id: songId }, data });

        // ID 배열이 온 경우에만 연결 목록을 통째로 교체한다.
        if (youtubeVideoIds) {
          await tx.songYoutubeVideo.deleteMany({ where: { songId } });
          await tx.songYoutubeVideo.createMany({
            data: youtubeVideoIds.map((youtubeVideoId) => ({
              songId,
              youtubeVideoId,
            })),
          });
        }

        if (spotifyTrackIds) {
          await tx.songSpotifyTrack.deleteMany({ where: { songId } });
          await tx.songSpotifyTrack.createMany({
            data: spotifyTrackIds.map((spotifyTrackId) => ({
              songId,
              spotifyTrackId,
            })),
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("song unique field already exists.");
      }

      throw error;
    }

    return { songId };
  }

  async deleteSong(songId: number): Promise<DeleteSongResponseDto> {
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { id: true },
    });

    if (!song) {
      throw new NotFoundException("song not found.");
    }

    // artist_song / song_youtube_video / song_spotify_track는 cascade로 함께 지워진다.
    await this.prisma.song.delete({ where: { id: songId } });

    return { deletedId: songId };
  }
}

function toYoutubeVideoDto(
  youtubeVideoId: string,
  infoById: Map<string, YoutubeVideoInfo>,
): SongYoutubeVideoDto {
  const info = infoById.get(youtubeVideoId);

  return {
    id: youtubeVideoId,
    title: info?.title ?? null,
    thumbnailMedium: info?.thumbnailMedium ?? null,
    viewCount: info?.viewCount ?? null,
  };
}

function toSpotifyTrackDto(
  spotifyTrackId: string,
  infoById: Map<string, SpotifyTrackInfo>,
): SongSpotifyTrackDto {
  const info = infoById.get(spotifyTrackId);

  return {
    id: spotifyTrackId,
    name: info?.name ?? null,
    releaseDate: info?.releaseDate ?? null,
    albumImage: info?.albumImage ?? null,
  };
}

function buildArtistWhere(
  search: string | undefined,
  hasSongsOnly: boolean,
): Prisma.ArtistWhereInput {
  const where: Prisma.ArtistWhereInput = {};
  const keyword = search?.trim();

  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { nameKo: { contains: keyword, mode: "insensitive" } },
      { nameJa: { contains: keyword, mode: "insensitive" } },
      { nameJaKana: { contains: keyword, mode: "insensitive" } },
      { nameJaPronu: { contains: keyword, mode: "insensitive" } },
      { nameLatin: { contains: keyword, mode: "insensitive" } },
      { tjName: { contains: keyword, mode: "insensitive" } },
      { slug: { contains: keyword, mode: "insensitive" } },
    ];
  }

  if (hasSongsOnly) {
    where.artistSongs = { some: {} };
  }

  return where;
}

function buildArtistOrderBy(
  sortBy: ArtistSortBy,
  sortOrder: SortOrder,
): Prisma.ArtistOrderByWithRelationInput {
  if (sortBy === "name") {
    return { name: sortOrder };
  }

  if (sortBy === "createdAt") {
    return { createdAt: sortOrder };
  }

  return { artistSongs: { _count: sortOrder } };
}

function buildSongSearchWhere(
  search: string | undefined,
): Prisma.SongWhereInput | undefined {
  const keyword = search?.trim();

  if (!keyword) {
    return undefined;
  }

  return {
    OR: [
      { title: { contains: keyword, mode: "insensitive" } },
      { titleKo: { contains: keyword, mode: "insensitive" } },
      { titleJa: { contains: keyword, mode: "insensitive" } },
      { titleJaPronu: { contains: keyword, mode: "insensitive" } },
      { titleJaKana: { contains: keyword, mode: "insensitive" } },
      { titleJaKanji: { contains: keyword, mode: "insensitive" } },
      { titleLatin: { contains: keyword, mode: "insensitive" } },
      { titleLatinPronu: { contains: keyword, mode: "insensitive" } },
      { tjSongId: { contains: keyword } },
    ],
  };
}

function buildSongUpdateData(
  body: UpdateSongRequestDto,
): Prisma.SongUpdateInput {
  const data: Prisma.SongUpdateInput = {};

  if (body.title !== undefined) {
    data.title = normalizeRequired(body.title, "title");
  }

  const nullableFields = [
    "titleKo",
    "titleJa",
    "titleJaPronu",
    "titleJaKana",
    "titleJaKanji",
    "titleLatin",
    "titleLatinPronu",
    "catalog",
    "thumbnailDefault",
    "thumbnailMedium",
    "thumbnailHigh",
  ] as const;

  for (const field of nullableFields) {
    if (body[field] !== undefined) {
      data[field] = normalizeNullable(body[field]);
    }
  }

  if (body.visible !== undefined) {
    if (typeof body.visible !== "boolean") {
      throw new BadRequestException("visible must be a boolean.");
    }

    data.visible = body.visible;
  }

  return data;
}

function parseOptionalIdArray(
  value: string[] | undefined,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException("id list must be an array.");
  }

  return Array.from(
    new Set(
      value.map((item) => String(item).trim()).filter((item) => item.length > 0),
    ),
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function parseArtistSortBy(value: string | undefined): ArtistSortBy {
  if (value === "name" || value === "createdAt") {
    return value;
  }

  return "songCount";
}

function parseSortOrder(
  value: string | undefined,
  sortBy: ArtistSortBy,
): SortOrder {
  if (value === "asc" || value === "desc") {
    return value;
  }

  // 곡 수/최신순은 많은 쪽이 먼저 보이는 게 자연스럽다.
  return sortBy === "name" ? "asc" : "desc";
}

function normalizeRequired(
  value: string | null | undefined,
  fieldName: string,
): string {
  const normalized = normalizeNullable(value);

  if (!normalized) {
    throw new BadRequestException(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || null;
}
