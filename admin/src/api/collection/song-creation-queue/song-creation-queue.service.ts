import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { CreateSongFromQueueRequestDto } from "./dto/create-song-from-queue-request.dto";
import { CreateSongFromQueueResponseDto } from "./dto/create-song-from-queue-response.dto";
import { DeleteSongCreationQueueResponseDto } from "./dto/delete-song-creation-queue-response.dto";
import { PushSongCreationQueueResponseDto } from "./dto/push-song-creation-queue-response.dto";
import { SongCreationQueueListResponseDto } from "./dto/song-creation-queue-list-response.dto";
import { SongMediaCandidatesResponseDto } from "./dto/song-media-candidates-response.dto";
import {
  parseQueueSpotifyTracks,
  parseQueueYoutubeVideos,
} from "./queue-media";
import { SongCreationQueueManager } from "./song-creation-queue.manager";

@Injectable()
export class SongCreationQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly songCreationQueueManager: SongCreationQueueManager,
  ) {}

  async findAll(): Promise<SongCreationQueueListResponseDto> {
    const items = await this.prisma.songCreationQueue.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 매칭된 아티스트 표시용으로 songArtistQueue → artist를 배치 조회한다.
    const tjSongIds = items
      .map((item) => item.tjSongId)
      .filter((tjSongId): tjSongId is string => tjSongId !== null);
    const songArtistQueueItems = await this.prisma.songArtistQueue.findMany({
      where: { tjSongId: { in: tjSongIds } },
      select: { tjSongId: true, artistId: true },
    });
    const artistIdByTjSongId = new Map(
      songArtistQueueItems.map((item) => [item.tjSongId, item.artistId]),
    );

    const artistIds = songArtistQueueItems
      .map((item) => item.artistId)
      .filter((artistId): artistId is number => artistId !== null);
    const artists = await this.prisma.artist.findMany({
      where: { id: { in: artistIds } },
      select: { id: true, name: true },
    });
    const artistById = new Map(artists.map((artist) => [artist.id, artist]));

    return {
      data: items.map((item) => {
        const artistId = item.tjSongId
          ? (artistIdByTjSongId.get(item.tjSongId) ?? null)
          : null;
        const artist = artistId !== null ? artistById.get(artistId) : undefined;

        return {
          id: item.id,
          tjSongId: item.tjSongId ?? undefined,
          catalog: item.catalog ?? undefined,
          title: item.title,
          titleKo: item.titleKo ?? undefined,
          titleJa: item.titleJa ?? undefined,
          titleJaPronu: item.titleJaPronu ?? undefined,
          titleJaKana: item.titleJaKana ?? undefined,
          titleJaKanji: item.titleJaKanji ?? undefined,
          titleLatin: item.titleLatin ?? undefined,
          titleLatinPronu: item.titleLatinPronu ?? undefined,
          tjTitle: item.tjTitle ?? undefined,
          tjArtist: item.tjArtist ?? undefined,
          youtubeVideos: parseQueueYoutubeVideos(item.youtubeVideos),
          spotifyTracks: parseQueueSpotifyTracks(item.spotifyTracks),
          thumbnailDefault: item.thumbnailDefault ?? undefined,
          thumbnailMedium: item.thumbnailMedium ?? undefined,
          thumbnailHigh: item.thumbnailHigh ?? undefined,
          artistId: artistId ?? undefined,
          artistName: artist?.name,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    };
  }

  async pushTjSongIds(
    tjSongIds: unknown,
  ): Promise<PushSongCreationQueueResponseDto> {
    const pushTjSongIds = parseTjSongIds(tjSongIds);
    let pushed = 0;

    for (const tjSongId of pushTjSongIds) {
      const item =
        await this.songCreationQueueManager.pushSongCreationQueueFromTj(
          tjSongId,
        );

      if (item) {
        pushed += 1;
      }
    }

    return {
      requested: pushTjSongIds.length,
      pushed,
      skipped: pushTjSongIds.length - pushed,
    };
  }

  async getMediaCandidates(
    queueId: number,
  ): Promise<SongMediaCandidatesResponseDto> {
    const queueItem = await this.prisma.songCreationQueue.findUnique({
      where: { id: queueId },
      select: { tjSongId: true },
    });

    if (!queueItem) {
      throw new NotFoundException("song creation queue item not found.");
    }

    if (!queueItem.tjSongId) {
      throw new BadRequestException("queue item has no tjSongId.");
    }

    const candidates = await this.songCreationQueueManager.getMediaCandidates(
      queueItem.tjSongId,
    );

    if (!candidates) {
      throw new BadRequestException(
        "song artist queue item is not matched to an artist.",
      );
    }

    return candidates;
  }

  async createSong(
    queueId: number,
    body: CreateSongFromQueueRequestDto | undefined,
  ): Promise<CreateSongFromQueueResponseDto> {
    const queueItem = await this.prisma.songCreationQueue.findUnique({
      where: { id: queueId },
      select: { id: true, tjSongId: true },
    });

    if (!queueItem) {
      throw new NotFoundException("song creation queue item not found.");
    }

    if (!queueItem.tjSongId) {
      throw new BadRequestException("queue item has no tjSongId.");
    }

    const tjSongId = queueItem.tjSongId;
    const songArtistQueueItem = await this.prisma.songArtistQueue.findUnique({
      where: { tjSongId },
      select: { artistId: true },
    });

    if (!songArtistQueueItem || songArtistQueueItem.artistId === null) {
      throw new BadRequestException(
        "song artist queue item is not matched to an artist.",
      );
    }

    const artistId = songArtistQueueItem.artistId;
    const title = normalizeRequired(body?.title, "title");

    try {
      const song = await this.prisma.$transaction(async (tx) => {
        const createdSong = await tx.song.create({
          data: {
            title,
            titleKo: normalizeNullable(body?.titleKo),
            titleJa: normalizeNullable(body?.titleJa),
            titleJaPronu: normalizeNullable(body?.titleJaPronu),
            titleJaKana: normalizeNullable(body?.titleJaKana),
            titleJaKanji: normalizeNullable(body?.titleJaKanji),
            titleLatin: normalizeNullable(body?.titleLatin),
            titleLatinPronu: normalizeNullable(body?.titleLatinPronu),
            catalog: normalizeNullable(body?.catalog),
            youtubeVideos: {
              create: parseIdArray(body?.youtubeVideoIds).map(
                (youtubeVideoId) => ({ youtubeVideoId }),
              ),
            },
            spotifyTracks: {
              create: parseIdArray(body?.spotifyTrackIds).map(
                (spotifyTrackId) => ({ spotifyTrackId }),
              ),
            },
            thumbnailDefault: normalizeNullable(body?.thumbnailDefault),
            thumbnailMedium: normalizeNullable(body?.thumbnailMedium),
            thumbnailHigh: normalizeNullable(body?.thumbnailHigh),
            tjSongId,
            visible: true, // 큐에서 수동 검토를 거쳤으므로 바로 공개
          },
        });

        await tx.artistSong.create({
          data: { artistId, songId: createdSong.id },
        });

        // 이 곡의 파이프라인이 끝났으므로 업스트림 큐를 정리한다.
        await tx.songArtistQueue.deleteMany({ where: { tjSongId } });
        await tx.songQueue.deleteMany({ where: { tjNumber: tjSongId } });

        return createdSong;
      });

      return { songId: song.id, artistId };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("song unique field already exists.");
      }

      throw error;
    }
  }

  async deleteItem(
    queueId: number,
  ): Promise<DeleteSongCreationQueueResponseDto> {
    const item = await this.prisma.songCreationQueue.findUnique({
      where: { id: queueId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException("song creation queue item not found.");
    }

    await this.prisma.songCreationQueue.delete({
      where: { id: queueId },
    });

    return { deletedId: queueId };
  }
}

function parseTjSongIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException("tjSongIds must be an array.");
  }

  const tjSongIds = Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0),
    ),
  );

  if (tjSongIds.length === 0) {
    throw new BadRequestException("tjSongIds is empty.");
  }

  return tjSongIds;
}

function parseIdArray(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.map((item) => String(item).trim()).filter((item) => item.length > 0),
    ),
  );
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
