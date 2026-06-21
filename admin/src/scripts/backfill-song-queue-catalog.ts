import "dotenv/config";
// Usage: cd admin && pnpm ts-node src/scripts/backfill-song-queue-catalog.ts
// song_queue.catalog가 비어 있는 row를 getCatalog() 결과로 한 번 백필한다.

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
  const queueItems = await prisma.songQueue.findMany({
    where: { catalog: null },
    select: {
      id: true,
      tjNumber: true,
      title: true,
      artist: true,
    },
    orderBy: { id: "asc" },
  });

  const knownArtists = await prisma.artist.findMany({
    where: { homeCatalog: { not: null } },
    select: { name: true, nameJa: true, tjName: true, homeCatalog: true },
  });

  let updated = 0;
  let skipped = 0;
  const skippedSamples: Array<{
    tjNumber: string;
    title: string;
    artist?: string;
  }> = [];

  for (const item of queueItems) {
    const catalog =
      findCatalogByKnownArtist(item.artist, knownArtists) ??
      getCatalog(item.title, item.artist, item.tjNumber);

    if (!catalog) {
      skipped += 1;

      if (skippedSamples.length < 20) {
        skippedSamples.push({
          tjNumber: item.tjNumber,
          title: item.title,
          artist: item.artist ?? undefined,
        });
      }

      continue;
    }

    await prisma.songQueue.update({
      where: { id: item.id },
      data: { catalog },
    });
    updated += 1;
  }

  console.log(`대상: ${queueItems.length}`);
  console.log(`업데이트: ${updated}`);
  console.log(`스킵: ${skipped}`);

  if (skippedSamples.length > 0) {
    console.log("스킵 샘플:");

    for (const sample of skippedSamples) {
      console.log(
        `- ${sample.tjNumber}: ${sample.title} / ${sample.artist ?? ""}`,
      );
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
