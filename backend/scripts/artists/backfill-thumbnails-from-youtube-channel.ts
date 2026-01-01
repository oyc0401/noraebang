import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

// pnpm --filter backend ts-node scripts/artists/backfill-thumbnails-from-youtube-channel.ts

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backfillArtistThumbnails() {
  console.log("📸 Backfilling artist thumbnails from youtube_channel...\n");

  const artists = await prisma.artist.findMany({
    include: {
      youtubeChannel: {
        select: {
          channelId: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  let updated = 0;
  let skippedNoChannel = 0;
  let skippedNoChange = 0;

  for (const artist of artists) {
    if (!artist.youtubeChannel) {
      skippedNoChannel++;
      continue;
    }

    const channel = artist.youtubeChannel;
    const desiredDefault = channel.thumbnailDefault ?? null;
    const desiredMedium = channel.thumbnailMedium ?? null;
    const desiredHigh = channel.thumbnailHigh ?? null;

    const requiresUpdate =
      artist.thumbnailDefault !== desiredDefault ||
      artist.thumbnailMedium !== desiredMedium ||
      artist.thumbnailHigh !== desiredHigh;

    if (!requiresUpdate) {
      skippedNoChange++;
      continue;
    }

    await prisma.artist.update({
      where: { id: artist.id },
      data: {
        thumbnailDefault: desiredDefault,
        thumbnailMedium: desiredMedium,
        thumbnailHigh: desiredHigh,
      },
    });

    updated++;
    console.log(
      `✅ Synced ${artist.name} (id: ${artist.id}) <- ${channel.channelId ?? "unknown channel"}`,
    );
  }

  console.log("\n📊 Done!");
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (no channel): ${skippedNoChannel}`);
  console.log(`   Skipped (already synced): ${skippedNoChange}`);
  console.log(
    `   Total processed: ${artists.length} (artists table rows considered)`,
  );
}

if (require.main === module) {
  backfillArtistThumbnails()
    .catch((error) => {
      console.error("❌ Failed to backfill thumbnails:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default backfillArtistThumbnails;
