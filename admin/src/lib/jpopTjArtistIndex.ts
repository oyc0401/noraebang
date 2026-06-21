import { PrismaService } from "../prisma/prisma.service";

export type JpopTjArtistIndexSong = {
  catalog: string | null;
  tjSong: {
    artist: string | null;
  } | null;
  artistSongs: Array<{
    artistId: number;
  }>;
};

export class JpopTjArtistIndex {
  private readonly artistIdByTjArtist = new Map<string, number>();

  constructor(songs: JpopTjArtistIndexSong[]) {
    for (const song of songs) {
      if (song.catalog !== "JPOP") {
        continue;
      }

      const tjArtist = song.tjSong?.artist;
      const artistId = song.artistSongs[0]?.artistId;

      if (!tjArtist || artistId === undefined) {
        continue;
      }

      const key = normalizeTjArtist(tjArtist);

      if (!this.artistIdByTjArtist.has(key)) {
        this.artistIdByTjArtist.set(key, artistId);
      }
    }
  }

  static async create(prisma: PrismaService): Promise<JpopTjArtistIndex> {
    const songs = await prisma.song.findMany({
      where: {
        catalog: "JPOP",
        tjSongId: { not: null },
      },
      select: {
        catalog: true,
        tjSong: {
          select: {
            artist: true,
          },
        },
        artistSongs: {
          select: {
            artistId: true,
          },
          orderBy: {
            artistId: "asc",
          },
        },
      },
    });

    return new JpopTjArtistIndex(songs);
  }

  findJpopArtistId(tjArtist: string | null): number | null {
    if (!tjArtist) {
      return null;
    }

    return this.artistIdByTjArtist.get(normalizeTjArtist(tjArtist)) ?? null;
  }
}

function normalizeTjArtist(tjArtist: string) {
  return tjArtist.replace(/\s/g, "").toLowerCase();
}
