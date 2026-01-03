import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { ChannelType, PrismaClient } from "@prisma/client";
import pg from "pg";
import { pathToFileURL } from "url";

// pnpm ts-node src/scripts/youtube/list-main-only-channels.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function listMainOnlyChannels(limit?: number) {
  try {
    console.log("🎬 Listing artists that only have MAIN YouTube channels...\n");

    const artists = await prisma.artist.findMany({
      where: {
        youtubeChannels: {
          some: {
            type: ChannelType.MAIN,
          },
        },
        NOT: {
          youtubeChannels: {
            some: {
              type: ChannelType.TOPIC,
            },
          },
        },
      },
      include: {
        youtubeChannels: true,
        artistSongs: {
          take: 1,
          orderBy: { order: "asc" },
          include: {
            song: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: limit ?? undefined,
    });

    if (artists.length === 0) {
      console.log("✅ No artists are missing topic channels!");
      return;
    }

    artists.forEach((artist, index) => {
      const mainChannel = artist.youtubeChannels.find(
        (channel) => channel.type === ChannelType.MAIN,
      );

      const representativeSong = artist.artistSongs[0]?.song?.title;

      console.log(
        `${index + 1}. ${artist.name} (${artist.nameKo}) - Main Channel: ${
          mainChannel?.title ?? "N/A"
        } (${mainChannel?.channelId ?? "?"})`,
      );

      if (representativeSong) {
        console.log(`   🎵 Representative song: ${representativeSong}`);
      }

      if (mainChannel?.customUrl) {
        console.log(`   🔗 URL: ${mainChannel.customUrl}`);
      }

      console.log("");
    });

    console.log(
      `📊 Total artists missing TOPIC channel: ${
        limit ? `${artists.length} (showing first ${limit})` : artists.length
      }`,
    );
  } catch (error) {
    console.error("❌ Failed to list main-only channels:", error);
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

  listMainOnlyChannels(limit)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { listMainOnlyChannels };
