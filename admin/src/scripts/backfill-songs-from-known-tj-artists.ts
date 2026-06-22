import "dotenv/config";
// Usage: cd admin && pnpm ts-node src/scripts/backfill-songs-from-known-tj-artists.ts
// Apply: cd admin && pnpm ts-node src/scripts/backfill-songs-from-known-tj-artists.ts --apply
// 기존 JPOP Song의 TJ artist와 같은 미생성 TJ 곡을 큐 매니저로 넣는다.

import { ParserService } from "../api/collection/parser/parser.service";
import { JpopTjArtistIndex } from "../lib/jpopTjArtistIndex";
import { PrismaService } from "../prisma/prisma.service";

type Candidate = {
  tjNumber: string;
  title: string;
  artist: string;
  matchedArtistId: number;
};

const shouldApply = process.argv.includes("--apply");
const prisma = new PrismaService();
const parserService = new ParserService(prisma);

async function main() {
  const jpopTjArtistIndex = await JpopTjArtistIndex.create(prisma);
  const tjSongs = await prisma.tjSong.findMany({
    where: {
      artist: { not: null },
      song: null,
    },
    select: {
      id: true,
      title: true,
      artist: true,
    },
    orderBy: { id: "asc" },
  });
  const candidates: Candidate[] = [];
  const skippedSamples: Array<{
    tjNumber: string;
    title: string;
    artist: string;
  }> = [];

  for (const tjSong of tjSongs) {
    const artist = tjSong.artist ?? undefined;

    if (!artist) {
      continue;
    }

    const matchedArtistId = jpopTjArtistIndex.findJpopArtistId(artist);

    if (matchedArtistId === null) {
      if (skippedSamples.length < 20) {
        skippedSamples.push({
          tjNumber: tjSong.id,
          title: tjSong.title,
          artist,
        });
      }

      continue;
    }

    candidates.push({
      tjNumber: tjSong.id,
      title: tjSong.title,
      artist,
      matchedArtistId,
    });
  }

  let queued = 0;

  if (shouldApply) {
    for (const candidate of candidates) {
      await parserService.pushRecentSongQueue(candidate.tjNumber);
      queued += 1;
    }
  }

  console.log(`모드: ${shouldApply ? "apply" : "dry-run"}`);
  console.log(`미생성 TJ 곡: ${tjSongs.length}`);
  console.log(`큐 후보: ${candidates.length}`);
  console.log(`큐 추가/갱신: ${queued}`);

  if (candidates.length > 0) {
    console.log("후보 샘플:");

    for (const candidate of candidates.slice(0, 30)) {
      console.log(
        `- ${candidate.tjNumber}: ${candidate.title} / ${candidate.artist} / artistId=${candidate.matchedArtistId}`,
      );
    }
  }

  if (skippedSamples.length > 0) {
    console.log("매칭 실패 샘플:");

    for (const sample of skippedSamples) {
      console.log(`- ${sample.tjNumber}: ${sample.title} / ${sample.artist}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
