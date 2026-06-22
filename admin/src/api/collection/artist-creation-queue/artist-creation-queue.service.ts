import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { ArtistCreationQueueListResponseDto } from "./dto/artist-creation-queue-list-response.dto";
import { CreateArtistFromQueueRequestDto } from "./dto/create-artist-from-queue-request.dto";
import { CreateArtistFromQueueResponseDto } from "./dto/create-artist-from-queue-response.dto";
import { DeleteArtistCreationQueueResponseDto } from "./dto/delete-artist-creation-queue-response.dto";
import { PushArtistCreationQueueResponseDto } from "./dto/push-artist-creation-queue-response.dto";
import { ArtistCreationQueueManager } from "./artist-creation-queue.manager";

@Injectable()
export class ArtistCreationQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artistCreationQueueManager: ArtistCreationQueueManager,
  ) {}

  async findAll(): Promise<ArtistCreationQueueListResponseDto> {
    const items = await this.prisma.artistCreationQueue.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      data: items.map((item) => ({
        id: item.id,
        tjSongId: item.tjSongId ?? undefined,
        homeCatalog: item.homeCatalog ?? undefined,
        name: item.name,
        nameKo: item.nameKo,
        nameJa: item.nameJa ?? undefined,
        nameJaKana: item.nameJaKana ?? undefined,
        nameJaPronu: item.nameJaPronu ?? undefined,
        nameLatin: item.nameLatin ?? undefined,
        nameLatinPronu: item.nameLatinPronu ?? undefined,
        tjName: item.tjName ?? undefined,
        slug: item.slug ?? undefined,
        youtubeChannel: item.youtube_channel ?? undefined,
        youtubeTopicChannel: item.youtube_topic_channel ?? undefined,
        spotifyId: item.spotifyId ?? undefined,
        thumbnailDefault: item.thumbnailDefault ?? undefined,
        thumbnailMedium: item.thumbnailMedium ?? undefined,
        thumbnailHigh: item.thumbnailHigh ?? undefined,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  async createArtist(
    queueId: number,
    body: CreateArtistFromQueueRequestDto | undefined,
  ): Promise<CreateArtistFromQueueResponseDto> {
    const queueItem = await this.prisma.artistCreationQueue.findUnique({
      where: { id: queueId },
      select: { id: true, tjSongId: true },
    });

    if (!queueItem) {
      throw new NotFoundException("artist creation queue item not found.");
    }

    const name = normalizeRequired(body?.name, "name");
    const nameKo = normalizeRequired(body?.nameKo, "nameKo");

    try {
      const artist = await this.prisma.$transaction(async (tx) => {
        const createdArtist = await tx.artist.create({
          data: {
            homeCatalog: normalizeNullable(body?.homeCatalog),
            name,
            nameKo,
            nameJa: normalizeNullable(body?.nameJa),
            nameJaKana: normalizeNullable(body?.nameJaKana),
            nameJaPronu: normalizeNullable(body?.nameJaPronu),
            nameLatin: normalizeNullable(body?.nameLatin),
            nameLatinPronu: normalizeNullable(body?.nameLatinPronu),
            tjName: normalizeNullable(body?.tjName),
            slug: normalizeNullable(body?.slug),
            youtube_channel: normalizeNullable(body?.youtubeChannel),
            youtube_topic_channel: normalizeNullable(body?.youtubeTopicChannel),
            spotifyId: normalizeNullable(body?.spotifyId),
            thumbnailDefault: normalizeNullable(body?.thumbnailDefault),
            thumbnailMedium: normalizeNullable(body?.thumbnailMedium),
            thumbnailHigh: normalizeNullable(body?.thumbnailHigh),
          },
        });

        if (queueItem.tjSongId) {
          const songArtistQueueItem = await tx.songArtistQueue.findUnique({
            where: { tjSongId: queueItem.tjSongId },
            select: { id: true },
          });

          if (songArtistQueueItem) {
            await tx.songArtistQueue.update({
              where: { id: songArtistQueueItem.id },
              data: { artistId: createdArtist.id },
            });
          }
        }

        return createdArtist;
      });

      return { artistId: artist.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("artist unique field already exists.");
      }

      throw error;
    }
  }

  async deleteItem(
    queueId: number,
  ): Promise<DeleteArtistCreationQueueResponseDto> {
    const item = await this.prisma.artistCreationQueue.findUnique({
      where: { id: queueId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException("artist creation queue item not found.");
    }

    await this.prisma.artistCreationQueue.delete({
      where: { id: queueId },
    });

    return { deletedId: queueId };
  }

  async pushTjSongIds(
    tjSongIds: unknown,
  ): Promise<PushArtistCreationQueueResponseDto> {
    const pushTjSongIds = parseTjSongIds(tjSongIds);
    let pushed = 0;

    for (const tjSongId of pushTjSongIds) {
      const item =
        await this.artistCreationQueueManager.pushArtistCreationQueueFromTj(
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
