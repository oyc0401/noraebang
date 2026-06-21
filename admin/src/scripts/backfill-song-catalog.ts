import "dotenv/config";
// Usage: cd admin && pnpm ts-node src/scripts/backfill-song-catalog.ts
// song.catalog가 비어 있는 row를 getCatalog() / Artist 매칭 결과로 한 번 백필한다.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { findCatalogByKnownArtist, getCatalog } from "../lib/getCatalog";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const songs = await prisma.song.findMany({
    where: { catalog: null },
    select: {
      id: true,
      title: true,
      tjSong: {
        select: {
          id: true,
          artist: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const knownArtists = await prisma.artist.findMany({
    where: { homeCatalog: { not: null } },
    select: { name: true, tjName: true, homeCatalog: true },
  });

  let updated = 0;
  let skipped = 0;
  const skippedSamples: Array<{
    id: number;
    title: string;
    artist?: string;
  }> = [];

  for (const song of songs) {
    const artist = song.tjSong?.artist ?? null;
    const tjNumber = song.tjSong?.id;

    const catalog =
      findCatalogByKnownArtist(artist, knownArtists) ??
      getCatalog(song.title, artist, tjNumber);

    if (!catalog) {
      skipped += 1;

      if (skippedSamples.length < 20) {
        skippedSamples.push({
          id: song.id,
          title: song.title,
          artist: artist ?? undefined,
        });
      }

      continue;
    }

    await prisma.song.update({
      where: { id: song.id },
      data: { catalog },
    });
    updated += 1;
  }

  console.log(`대상: ${songs.length}`);
  console.log(`업데이트: ${updated}`);
  console.log(`스킵: ${skipped}`);

  if (skippedSamples.length > 0) {
    console.log("스킵 샘플:");

    for (const sample of skippedSamples) {
      console.log(`- ${sample.id}: ${sample.title} / ${sample.artist ?? ""}`);
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
    await pool.end();
  });
