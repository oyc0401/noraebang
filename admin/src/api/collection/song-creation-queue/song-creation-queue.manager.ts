import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { toHiragana } from "../artist-creation-queue/ja";
import { getJaPron, getLatinPron } from "../artist-creation-queue/pron";
import { searchSongMedia, type SearchSongMediaResult } from "./index";
import type { YoutubeVideoMatch } from "./youtube";
import { getTitleKo } from "./title-generater";

@Injectable()
export class SongCreationQueueManager {
  constructor(private readonly prisma: PrismaService) {}

  // 아티스트 매칭이 끝난 TJ곡을 미디어 매칭 + 제목 변형으로 보강해 큐에 넣는다.
  async pushSongCreationQueueFromTj(tjsongNumber: string) {
    const tjSongId = tjsongNumber.trim();

    if (!tjSongId) {
      return null;
    }

    const tjSong = await this.prisma.tjSong.findUnique({
      where: { id: tjSongId },
      select: { id: true, title: true, artist: true },
    });

    if (!tjSong) {
      return null;
    }

    // 미매칭 곡은 artistId가 없어 미디어 검색이 불가능하므로 큐에 넣지 않는다.
    const artistId = await this.findMatchedArtistId(tjSongId);

    if (artistId === null) {
      return null;
    }

    const title = normalizeRequired(tjSong.title);

    if (!title) {
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

    const data = {
      tjSongId,
      catalog: "JPOP",
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
      tjTitle: tjSong.title,
      tjArtist: tjSong.artist,
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
    };

    return this.prisma.songCreationQueue.upsert({
      where: { tjSongId },
      create: data,
      update: data,
    });
  }

  // 검토 UI가 후보 목록(제목/썸네일/조회수 등)을 실시간으로 다시 조회할 때 쓴다.
  async getMediaCandidates(
    tjSongId: string,
  ): Promise<SearchSongMediaResult | null> {
    const tjSong = await this.prisma.tjSong.findUnique({
      where: { id: tjSongId },
      select: { title: true },
    });

    if (!tjSong) {
      return null;
    }

    const artistId = await this.findMatchedArtistId(tjSongId);

    if (artistId === null) {
      return null;
    }

    return searchSongMedia(tjSong.title, artistId);
  }

  private async findMatchedArtistId(tjSongId: string): Promise<number | null> {
    const queueItem = await this.prisma.songArtistQueue.findUnique({
      where: { tjSongId },
      select: { artistId: true },
    });

    return queueItem?.artistId ?? null;
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
