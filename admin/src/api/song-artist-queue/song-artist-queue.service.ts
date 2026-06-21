import { Injectable } from "@nestjs/common";
import { JpopTjArtistIndex } from "../../lib/jpopTjArtistIndex";
import { PrismaService } from "../../prisma/prisma.service";

type SyncSongArtistQueueResult = {
  scanned: number;
  matched: number;
  unmatched: number;
};

@Injectable()
export class SongArtistQueueService {
  constructor(private readonly prisma: PrismaService) {}

  // SongQueue의 JPOP 항목을 SongArtistQueue로 옮기면서 가수 매칭을 시도한다.
  // artistId가 null이면 가수 미매칭 상태이고, 다시 실행하면 매칭이 갱신된다.
  async syncSongArtistQueue(): Promise<SyncSongArtistQueueResult> {
    const items = await this.prisma.songQueue.findMany({
      where: { catalog: "JPOP" },
      select: { tjNumber: true, artist: true },
    });

    const index = await JpopTjArtistIndex.create(this.prisma);
    let matched = 0;
    let unmatched = 0;

    for (const item of items) {
      const artistId = index.findJpopArtistId(item.artist);

      await this.prisma.songArtistQueue.upsert({
        where: { tjSongId: item.tjNumber },
        create: { tjSongId: item.tjNumber, artistId },
        update: { artistId },
      });

      if (artistId !== null) {
        matched += 1;
      } else {
        unmatched += 1;
      }
    }

    return { scanned: items.length, matched, unmatched };
  }
}
