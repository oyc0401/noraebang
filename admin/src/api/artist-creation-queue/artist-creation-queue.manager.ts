import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { toHiragana } from "./ja";
import { getNameKo } from "./name-generater";
import { getJaPron, getLatinPron } from "./pron";
import { getArtistId } from "./spotify";
import { getYoutubeChannel, getYoutubeChannelInfo } from "./youtube";

export type ArtistCreationQueueInput = {
  tjSongId: string;
  tjsongTitle: string;
  artist: string | null;
  homeCatalog?: string | null;
};

@Injectable()
export class ArtistCreationQueueManager {
  constructor(private readonly prisma: PrismaService) {}

  async pushArtistCreationQueueFromTj(tjsongNumber: string) {
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

    return this.pushFromTjSong({
      tjSongId: tjSong.id,
      tjsongTitle: tjSong.title,
      artist: tjSong.artist,
      homeCatalog: "JPOP",
    });
  }

  private async pushFromTjSong(input: ArtistCreationQueueInput) {
    const tjSongId = input.tjSongId.trim();
    const tjName = normalizeNullable(input.artist);

    if (!tjSongId || !tjName) {
      return null;
    }

    const name = normalizeArtistName(tjName);
    const nameJa = hasJapanese(name) ? name : null;
    const nameJaKana = nameJa
      ? normalizeNullable(await toHiragana(nameJa))
      : null;
    const nameLatin = hasLatinOnly(name) ? name : null;

    const youtubeChannel = await getYoutubeChannel(name);
    const selectedYoutubeChannelId =
      youtubeChannel.main ?? youtubeChannel.topic ?? null;
    const youtubeChannelInfo = await getYoutubeChannelInfo(
      selectedYoutubeChannelId,
    );
    const nameKo = await getNameKo(youtubeChannelInfo?.title ?? name);
    const thumbnails = youtubeChannelInfo?.thumbnails ?? {};

    const data = {
      tjSongId,
      homeCatalog: normalizeNullable(input.homeCatalog),
      name,
      nameKo,
      nameJa,
      nameJaKana,
      nameJaPronu: nameJaKana ? await getJaPron(nameJaKana) : null,
      nameLatin,
      nameLatinPronu: nameLatin ? getLatinPron(nameLatin) : null,
      tjName,
      tjNameJa: null, // 무조건 null
      slug: null, // 일단 null
      youtube_channel: youtubeChannel.main ?? null,
      youtube_topic_channel: youtubeChannel.topic ?? null,
      spotifyId: (await getArtistId(name)) || null,
      thumbnailDefault: thumbnails.normal ?? null,
      thumbnailHigh: thumbnails.high ?? null,
      thumbnailMedium: thumbnails.medium ?? null,
    };

    return this.prisma.artistCreationQueue.upsert({
      where: { tjSongId },
      create: data,
      update: data,
    });
  }
}

function normalizeArtistName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || null;
}

function hasJapanese(value: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(value);
}

function hasLatinOnly(value: string): boolean {
  return /^[a-zA-Z0-9\s&._'-]+$/.test(value);
}
