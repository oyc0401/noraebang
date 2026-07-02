import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  findSpotifyTrackInfos,
  findYoutubeVideoInfos,
} from "../../song/media-lookup";
import { SongMediaCandidatesResponseDto } from "../song-creation-queue/dto/song-media-candidates-response.dto";
import {
  parseQueueSpotifyTracks,
  parseQueueYoutubeVideos,
} from "../song-creation-queue/queue-media";
import { ApplySongUpdateRequestDto } from "./dto/apply-song-update-request.dto";
import { ApplySongUpdateResponseDto } from "./dto/apply-song-update-response.dto";
import { DeleteSongUpdateQueueResponseDto } from "./dto/delete-song-update-queue-response.dto";
import { PushSongUpdateQueueResponseDto } from "./dto/push-song-update-queue-response.dto";
import { SongUpdateQueueListResponseDto } from "./dto/song-update-queue-list-response.dto";
import { CurrentSongDto } from "./dto/song-update-queue-item.dto";
import { SongUpdateQueueManager } from "./song-update-queue.manager";

@Injectable()
export class SongUpdateQueueService {
  private readonly logger = new Logger(SongUpdateQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly songUpdateQueueManager: SongUpdateQueueManager,
  ) {}

  async findAll(): Promise<SongUpdateQueueListResponseDto> {
    const items = await this.prisma.songUpdateQueue.findMany({
      orderBy: { createdAt: "desc" },
    });

    const songIds = items.map((item) => item.songId);
    const songs = await this.prisma.song.findMany({
      where: { id: { in: songIds } },
      include: {
        youtubeVideos: { select: { youtubeVideoId: true } },
        spotifyTracks: { select: { spotifyTrackId: true } },
        artistSongs: {
          orderBy: { id: "asc" },
          take: 1,
          select: { artist: { select: { id: true, name: true } } },
        },
      },
    });
    const songById = new Map(songs.map((song) => [song.id, song]));

    // 조인 테이블에는 ID만 있으므로 표시용 제목은 media db에서 배치 조회한다.
    const youtubeVideoIds = songs.flatMap((song) =>
      song.youtubeVideos.map((video) => video.youtubeVideoId),
    );
    const spotifyTrackIds = songs.flatMap((song) =>
      song.spotifyTracks.map((track) => track.spotifyTrackId),
    );
    const [youtubeInfoById, spotifyInfoById] = await Promise.all([
      findYoutubeVideoInfos(Array.from(new Set(youtubeVideoIds))),
      findSpotifyTrackInfos(Array.from(new Set(spotifyTrackIds))),
    ]);

    return {
      data: items.map((item) => {
        const song = songById.get(item.songId);
        const artist = song?.artistSongs[0]?.artist;

        const currentSong: CurrentSongDto | undefined = song
          ? {
              title: song.title,
              titleKo: song.titleKo ?? undefined,
              titleJa: song.titleJa ?? undefined,
              titleJaPronu: song.titleJaPronu ?? undefined,
              titleJaKana: song.titleJaKana ?? undefined,
              titleJaKanji: song.titleJaKanji ?? undefined,
              titleLatin: song.titleLatin ?? undefined,
              titleLatinPronu: song.titleLatinPronu ?? undefined,
              catalog: song.catalog ?? undefined,
              visible: song.visible,
              thumbnailDefault: song.thumbnailDefault ?? undefined,
              thumbnailMedium: song.thumbnailMedium ?? undefined,
              thumbnailHigh: song.thumbnailHigh ?? undefined,
              youtubeVideos: song.youtubeVideos.map((video) => ({
                id: video.youtubeVideoId,
                label:
                  youtubeInfoById.get(video.youtubeVideoId)?.title ??
                  video.youtubeVideoId,
              })),
              spotifyTracks: song.spotifyTracks.map((track) => ({
                id: track.spotifyTrackId,
                label:
                  spotifyInfoById.get(track.spotifyTrackId)?.name ??
                  track.spotifyTrackId,
              })),
            }
          : undefined;

        return {
          id: item.id,
          songId: item.songId,
          title: item.title,
          titleKo: item.titleKo ?? undefined,
          titleJa: item.titleJa ?? undefined,
          titleJaPronu: item.titleJaPronu ?? undefined,
          titleJaKana: item.titleJaKana ?? undefined,
          titleJaKanji: item.titleJaKanji ?? undefined,
          titleLatin: item.titleLatin ?? undefined,
          titleLatinPronu: item.titleLatinPronu ?? undefined,
          youtubeVideos: parseQueueYoutubeVideos(item.youtubeVideos),
          spotifyTracks: parseQueueSpotifyTracks(item.spotifyTracks),
          thumbnailDefault: item.thumbnailDefault ?? undefined,
          thumbnailMedium: item.thumbnailMedium ?? undefined,
          thumbnailHigh: item.thumbnailHigh ?? undefined,
          artistId: artist?.id,
          artistName: artist?.name,
          currentSong,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    };
  }

  async pushSongIds(
    songIds: unknown,
  ): Promise<PushSongUpdateQueueResponseDto> {
    const pushSongIds = parseSongIds(songIds);
    let pushed = 0;

    for (const songId of pushSongIds) {
      try {
        const item =
          await this.songUpdateQueueManager.pushSongUpdateQueueFromSong(
            songId,
          );

        if (item) {
          pushed += 1;
        }
      } catch (error) {
        this.logger.error(
          `Failed to push song update queue for songId=${songId}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    return {
      requested: pushSongIds.length,
      pushed,
      skipped: pushSongIds.length - pushed,
    };
  }

  async getMediaCandidates(
    queueId: number,
  ): Promise<SongMediaCandidatesResponseDto> {
    const queueItem = await this.prisma.songUpdateQueue.findUnique({
      where: { id: queueId },
      select: { songId: true },
    });

    if (!queueItem) {
      throw new NotFoundException("song update queue item not found.");
    }

    const candidates = await this.songUpdateQueueManager.getMediaCandidates(
      queueItem.songId,
    );

    if (!candidates) {
      throw new BadRequestException(
        "song is missing or not linked to an artist.",
      );
    }

    return candidates;
  }

  async applyUpdate(
    queueId: number,
    body: ApplySongUpdateRequestDto | undefined,
  ): Promise<ApplySongUpdateResponseDto> {
    const queueItem = await this.prisma.songUpdateQueue.findUnique({
      where: { id: queueId },
      select: { id: true, songId: true },
    });

    if (!queueItem) {
      throw new NotFoundException("song update queue item not found.");
    }

    const song = await this.prisma.song.findUnique({
      where: { id: queueItem.songId },
      select: { id: true },
    });

    if (!song) {
      throw new NotFoundException("target song not found.");
    }

    const title = normalizeRequired(body?.title, "title");

    await this.prisma.$transaction(async (tx) => {
      await tx.song.update({
        where: { id: song.id },
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
          thumbnailDefault: normalizeNullable(body?.thumbnailDefault),
          thumbnailMedium: normalizeNullable(body?.thumbnailMedium),
          thumbnailHigh: normalizeNullable(body?.thumbnailHigh),
        },
      });

      // 미디어 연결은 추가만 한다. 기존 연결은 건드리지 않는다 (스펙 확정 사항).
      await tx.songYoutubeVideo.createMany({
        data: parseIdArray(body?.youtubeVideoIds).map((youtubeVideoId) => ({
          songId: song.id,
          youtubeVideoId,
        })),
        skipDuplicates: true,
      });
      await tx.songSpotifyTrack.createMany({
        data: parseIdArray(body?.spotifyTrackIds).map((spotifyTrackId) => ({
          songId: song.id,
          spotifyTrackId,
        })),
        skipDuplicates: true,
      });

      // 이 곡의 검토가 끝났으므로 큐에서 제거한다.
      await tx.songUpdateQueue.delete({ where: { id: queueItem.id } });
    });

    return { songId: song.id };
  }

  async deleteItem(
    queueId: number,
  ): Promise<DeleteSongUpdateQueueResponseDto> {
    const item = await this.prisma.songUpdateQueue.findUnique({
      where: { id: queueId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException("song update queue item not found.");
    }

    await this.prisma.songUpdateQueue.delete({
      where: { id: queueId },
    });

    return { deletedId: queueId };
  }
}

function parseSongIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException("songIds must be an array.");
  }

  const songIds = Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );

  if (songIds.length === 0) {
    throw new BadRequestException("songIds is empty.");
  }

  return songIds;
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
