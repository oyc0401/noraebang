import { TjService, type TjSongData } from "../thirdparty/tj";
import { pushRecentSongQueue } from "./push-recent-song-queue";
import { prisma } from "./prisma";

type ParserResult = {
  fetched: number;
  created: number;
  updated: number;
  queued: number;
};

const tjService = new TjService();

export async function recentPaser(
  yearMonth: string | number,
): Promise<ParserResult> {
  const searchYm = yearMonth.toString();
  const songs = await tjService.fetchSongsFromYearMonth(searchYm);
  const result: ParserResult = {
    fetched: songs.length,
    created: 0,
    updated: 0,
    queued: 0,
  };

  for (const song of songs) {
    const created = await upsertRecentTjSong(song);

    if (created) {
      result.created += 1;
      await pushRecentSongQueue(song.karaokeNo);
      result.queued += 1;
    } else {
      result.updated += 1;
    }
  }

  return result;
}

async function upsertRecentTjSong(song: TjSongData): Promise<boolean> {
  const existing = await prisma.tjSong.findUnique({
    where: { id: song.karaokeNo },
    select: { id: true },
  });

  await prisma.tjSong.upsert({
    where: { id: song.karaokeNo },
    create: {
      id: song.karaokeNo,
      title: song.title,
      artist: song.artist,
      lyricist: song.lyricist || null,
      composer: song.composer || null,
      thumbnailImg: song.thumbnailImg || null,
      publishdate: song.publishdate,
      isMV: song.isMV,
    },
    update: {
      title: song.title,
      artist: song.artist,
      lyricist: song.lyricist || null,
      composer: song.composer || null,
      thumbnailImg: song.thumbnailImg || null,
      publishdate: song.publishdate,
      isMV: song.isMV,
    },
  });

  return !existing;
}
