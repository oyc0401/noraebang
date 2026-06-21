import { getTjSongByArtist, type TjSongInfo } from "../thirdparty/tj";
import { pushRecentSongQueue } from "./push-recent-song-queue";
import { prisma } from "./prisma";

type ParserResult = {
  searchedArtists: number;
  fetched: number;
  created: number;
  updated: number;
  queued: number;
};

export async function searchParser(): Promise<ParserResult> {
  const artistNames = await getArtistNames();
  const result: ParserResult = {
    searchedArtists: artistNames.length,
    fetched: 0,
    created: 0,
    updated: 0,
    queued: 0,
  };

  for (const artistName of artistNames) {
    const songs = await getTjSongByArtist(artistName);
    result.fetched += songs.length;

    for (const song of songs) {
      const created = await upsertSearchTjSong(song);

      if (created) {
        result.created += 1;
        await pushRecentSongQueue(song.songNumber);
        result.queued += 1;
      } else {
        result.updated += 1;
      }
    }
  }

  return result;
}

async function getArtistNames(): Promise<string[]> {
  const artists = await prisma.artist.findMany({
    select: { name: true },
    orderBy: { id: "asc" },
  });

  return Array.from(
    new Set(
      artists
        .map((artist) => artist.name.trim())
        .filter((artistName) => artistName.length > 0),
    ),
  );
}

async function upsertSearchTjSong(song: TjSongInfo): Promise<boolean> {
  const existing = await prisma.tjSong.findUnique({
    where: { id: song.songNumber },
    select: { id: true },
  });

  await prisma.tjSong.upsert({
    where: { id: song.songNumber },
    create: {
      id: song.songNumber,
      title: song.title,
      artist: song.artist,
      lyricist: song.lyricist || null,
      composer: song.composer || null,
      isMR: song.isMR,
      isMV: song.isMV,
      isOver60: song.isOver60,
      youtubeLink: song.youtubeLink || null,
    },
    update: {
      title: song.title,
      artist: song.artist,
      lyricist: song.lyricist || null,
      composer: song.composer || null,
      isMR: song.isMR,
      isMV: song.isMV,
      isOver60: song.isOver60,
      youtubeLink: song.youtubeLink || null,
    },
  });

  return !existing;
}
