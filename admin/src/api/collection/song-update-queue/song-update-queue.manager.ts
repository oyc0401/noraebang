import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { toHiragana } from "../artist-creation-queue/ja";
import { getJaPron, getLatinPron } from "../artist-creation-queue/pron";
import {
  searchSongMedia,
  type SearchSongMediaResult,
} from "../song-creation-queue/index";
import { getTitleKo } from "../song-creation-queue/title-generater";
import type { YoutubeVideoMatch } from "../song-creation-queue/youtube";

@Injectable()
export class SongUpdateQueueManager {
  constructor(private readonly prisma: PrismaService) {}

  // 저장된 Song을 미디어 재매칭 + 제목 변형 재생성으로 보강해 업데이트 큐에 넣는다.
  async pushSongUpdateQueueFromSong(songId: number) {
    // 이미 큐에 있는 곡은 다시 보강하지 않는다 (검토 중인 스냅샷 보존).
    const existing = await this.prisma.songUpdateQueue.findUnique({
      where: { songId },
      select: { id: true },
    });

    if (existing) {
      return null;
    }

    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { id: true, title: true },
    });

    if (!song) {
      return null;
    }

    const title = normalizeRequired(song.title);

    if (!title) {
      return null;
    }

    // 가수 미연결 곡은 미디어 검색이 불가능하므로 큐에 넣지 않는다.
    const artistId = await this.findLinkedArtistId(songId);

    if (artistId === null) {
      return null;
    }

    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { name: true },
    });

    const media = await searchSongMedia(title, artistId);
    const titleJa = media.titleJa;
    const titleLatin = media.titleLatin;
    const titleJaKana = titleJa
      ? normalizeNullable(await toHiragana(titleJa))
      : null;
    const topYoutubeVideo = pickTopYoutubeVideo(media.youtubeVideos);

    return this.prisma.songUpdateQueue.create({
      data: {
        songId,
        title,
        titleKo: normalizeNullable(
          await getTitleKo(titleJa ?? title, artist?.name ?? null),
        ),
        titleJa,
        titleJaKana,
        titleJaPronu: titleJaKana ? await getJaPron(titleJaKana) : null,
        titleJaKanji: titleJa && hasKanji(titleJa) ? titleJa : null,
        titleLatin,
        titleLatinPronu: titleLatin ? getLatinPron(titleLatin) : null,
        // UI에서 제목을 바로 보여줄 수 있게 표시용 필드까지 JSON으로 저장한다.
        youtubeVideos: media.youtubeVideos.map((video) => ({
          id: video.id,
          title: video.title,
          thumbnailMedium: video.thumbnailMedium,
          viewCount: video.viewCount,
        })),
        spotifyTracks: media.spotifyTracks.map((track) => ({
          id: track.id,
          name: track.name,
          releaseDate: track.releaseDate,
          albumImage: track.albumImages[0] ?? null,
        })),
        thumbnailDefault: topYoutubeVideo?.thumbnailDefault ?? null,
        thumbnailMedium: topYoutubeVideo?.thumbnailMedium ?? null,
        thumbnailHigh: topYoutubeVideo?.thumbnailHigh ?? null,
      },
    });
  }

  // 검토 UI가 후보 목록(제목/썸네일/조회수 등)을 실시간으로 다시 조회할 때 쓴다.
  async getMediaCandidates(
    songId: number,
  ): Promise<SearchSongMediaResult | null> {
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { title: true },
    });

    if (!song) {
      return null;
    }

    const artistId = await this.findLinkedArtistId(songId);

    if (artistId === null) {
      return null;
    }

    return searchSongMedia(song.title, artistId);
  }

  private async findLinkedArtistId(songId: number): Promise<number | null> {
    const artistSong = await this.prisma.artistSong.findFirst({
      where: { songId },
      select: { artistId: true },
      orderBy: { id: "asc" },
    });

    return artistSong?.artistId ?? null;
  }
}

function pickTopYoutubeVideo(
  videos: YoutubeVideoMatch[],
): YoutubeVideoMatch | null {
  let top: YoutubeVideoMatch | null = null;
  let topViewCount = -1;

  for (const video of videos) {
    const viewCount = Number(video.viewCount ?? 0);

    if (viewCount > topViewCount) {
      top = video;
      topViewCount = viewCount;
    }
  }

  return top;
}

function hasKanji(value: string): boolean {
  return /[一-龯]/.test(value);
}

function normalizeRequired(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized || null;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || null;
}
