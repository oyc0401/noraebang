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

export type JpopTjArtistIndexArtist = {
  id: number;
  name: string;
  tjName: string | null;
};

export class JpopTjArtistIndex {
  private readonly artistIdByArtistName = new Map<string, number>();
  private readonly artistIdByTjArtist = new Map<string, number>();

  constructor(
    artists: JpopTjArtistIndexArtist[],
    songs: JpopTjArtistIndexSong[],
  ) {
    for (const artist of artists) {
      for (const name of [artist.name, artist.tjName]) {
        if (!name) {
          continue;
        }

        const key = normalizeTjArtist(name);

        if (!this.artistIdByArtistName.has(key)) {
          this.artistIdByArtistName.set(key, artist.id);
        }
      }
    }

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
    const artists = await prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        tjName: true,
      },
    });

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

    return new JpopTjArtistIndex(artists, songs);
  }

  // Artist.name/tjName과 직접 일치하는 경우를 먼저 확인하고,
  // 없으면 기존에 JPOP으로 분류된 곡의 TJ artist 문자열로 보정한다.
  findJpopArtistId(tjArtist: string | null): number | null {
    if (!tjArtist) {
      return null;
    }

    const key = normalizeTjArtist(tjArtist);

    return (
      this.artistIdByArtistName.get(key) ??
      this.artistIdByTjArtist.get(key) ??
      null
    );
  }
}

function normalizeTjArtist(tjArtist: string) {
  return tjArtist.replace(/\s/g, "").toLowerCase();
}
