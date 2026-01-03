import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { ChannelType, PrismaClient } from "@prisma/client";
import pg from "pg";
import { pathToFileURL } from "url";

// pnpm ts-node src/scripts/youtube/update-artist-thumbnails.ts [limit]

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function updateArtistThumbnails(limit?: number) {
  try {
    console.log("🖼  Syncing artist thumbnails from topic channels...\n");

    const artists = await prisma.artist.findMany({
      where: {
        youtubeChannels: {
          some: { type: ChannelType.TOPIC },
        },
      },
      include: {
        youtubeChannels: {
          where: { type: ChannelType.TOPIC },
        },
      },
      orderBy: { name: "asc" },
      take: limit ?? undefined,
    });

    if (artists.length === 0) {
      console.log("✅ No artists with topic channels found.");
      return;
    }

    let updated = 0;

    for (const artist of artists) {
      const topicChannel = artist.youtubeChannels.find(
        (channel) => channel.type === ChannelType.TOPIC,
      );

      if (!topicChannel) {
        continue;
      }

      await prisma.artist.update({
        where: { id: artist.id },
        data: {
          thumbnailDefault: topicChannel.thumbnailDefault,
          thumbnailMedium: topicChannel.thumbnailMedium,
          thumbnailHigh: topicChannel.thumbnailHigh,
        },
      });

      updated++;

      console.log(
        `   ✅ ${artist.name} (${artist.nameKo}) thumbnails updated from Topic channel.`,
      );
    }

    console.log(
      `\n📊 Summary: ${updated} artist(s) updated (processed ${artists.length}).`,
    );
  } catch (error) {
    console.error("❌ Failed to sync thumbnails:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

const isDirectExecution =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  const limitArg = process.argv[2];
  const limit = limitArg ? Number(limitArg) : undefined;

  updateArtistThumbnails(limit)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { updateArtistThumbnails };
