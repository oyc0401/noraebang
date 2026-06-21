import { getCatalog } from "../lib/getCatalog";
import { prisma } from "./prisma";

export async function pushRecentSongQueue(
  tjNumber: string | number,
): Promise<void> {
  const song = await prisma.tjSong.findUnique({
    where: { id: String(tjNumber) },
    select: {
      id: true,
      title: true,
      artist: true,
      publishdate: true,
    },
  });

  if (!song) {
    throw new Error(`TjSong ${tjNumber} not found.`);
  }

  await prisma.songQueue.upsert({
    where: { tjNumber: song.id },
    create: {
      tjNumber: song.id,
      title: song.title,
      artist: song.artist,
      publishdate: song.publishdate,
      catalog: getCatalog(song.title, song.artist),
    },
    update: {
      title: song.title,
      artist: song.artist,
      publishdate: song.publishdate,
      catalog: getCatalog(song.title, song.artist),
    },
  });
}
