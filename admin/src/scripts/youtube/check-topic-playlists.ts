import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// pnpm ts-node src/scripts/youtube/check-topic-playlists.ts

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  throw new Error("YOUTUBE_API_KEY is not set");
}

async function youtubeFetch(path: string, params: Record<string, string>) {
  const query = new URLSearchParams({
    ...params,
    key: YOUTUBE_API_KEY!,
  });
  const response = await fetch(`${YOUTUBE_API_BASE}/${path}?${query.toString()}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || `YouTube API error (${response.status})`);
  }

  return data;
}

async function getPlaylistsFromChannel(
  channelId: string,
  maxResults: number = 5,
): Promise<any[]> {
  const data = await youtubeFetch("playlists", {
    part: "snippet,contentDetails",
    channelId,
    maxResults: String(maxResults),
  });

  const items = Array.isArray(data.items) ? data.items : [];

  return items.map((item: any) => ({
    playlistId: item.id,
    title: item.snippet?.title ?? "Untitled playlist",
    description: item.snippet?.description ?? "",
    itemCount: item.contentDetails?.itemCount ?? 0,
    publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
  }));
}

async function getVideosFromPlaylist(
  playlistId: string,
  maxResults: number = 20,
): Promise<any[]> {
  const data = await youtubeFetch("playlistItems", {
    part: "snippet",
    playlistId,
    maxResults: String(maxResults),
  });

  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .map((item: any) => ({
      videoId: item.snippet?.resourceId?.videoId ?? "",
      title: item.snippet?.title ?? "Untitled video",
      description: item.snippet?.description ?? "",
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      channelId:
        item.snippet?.videoOwnerChannelId ??
        item.snippet?.channelId ??
        "unknown",
      channelTitle:
        item.snippet?.videoOwnerChannelTitle ??
        item.snippet?.channelTitle ??
        "Unknown Channel",
    }))
    .filter((video: any) => Boolean(video.videoId));
}

async function getChannelDetails(channelId: string): Promise<any> {
  const params: Record<string, string> = {
    part: "snippet,statistics,contentDetails",
  };
  if (channelId.startsWith("@")) {
    params.forHandle = channelId.slice(1);
  } else {
    params.id = channelId;
  }

  const data = await youtubeFetch("channels", params);
  const channel = Array.isArray(data.items) ? data.items[0] : null;

  if (!channel) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const snippet = channel.snippet ?? {};
  const statistics = channel.statistics ?? {};
  const contentDetails = channel.contentDetails ?? {};

  return {
    channelId: channel.id,
    title: snippet.title ?? "Unknown Channel",
    description: snippet.description ?? "",
    customUrl: snippet.customUrl,
    publishedAt: snippet.publishedAt ?? new Date().toISOString(),
    country: snippet.country,
    defaultLanguage: snippet.defaultLanguage,
    thumbnailDefault: snippet.thumbnails?.default?.url,
    thumbnailMedium: snippet.thumbnails?.medium?.url,
    thumbnailHigh: snippet.thumbnails?.high?.url,
    subscriberCount: statistics.subscriberCount
      ? parseInt(statistics.subscriberCount, 10)
      : undefined,
    videoCount: statistics.videoCount
      ? parseInt(statistics.videoCount, 10)
      : undefined,
    viewCount: statistics.viewCount ? BigInt(statistics.viewCount) : undefined,
    hiddenSubscriberCount: statistics.hiddenSubscriberCount,
    uploadsPlaylistId: contentDetails.relatedPlaylists?.uploads,
  };
}

async function updateArtistChannel(artistId: number, channelId: string) {
  const channelDetails = await getChannelDetails(channelId);

  await prisma.artist.update({
    where: { id: artistId },
    data: {
      thumbnailDefault: channelDetails.thumbnailDefault,
      thumbnailMedium: channelDetails.thumbnailMedium,
      thumbnailHigh: channelDetails.thumbnailHigh,
    },
  });

  await prisma.youtubeChannel.upsert({
    where: { artistId },
    create: {
      artistId,
      channelId: channelDetails.channelId,
      title: channelDetails.title,
      description: channelDetails.description,
      customUrl: channelDetails.customUrl,
      publishedAt: new Date(channelDetails.publishedAt),
      country: channelDetails.country,
      defaultLanguage: channelDetails.defaultLanguage,
      thumbnailDefault: channelDetails.thumbnailDefault,
      thumbnailMedium: channelDetails.thumbnailMedium,
      thumbnailHigh: channelDetails.thumbnailHigh,
      subscriberCount: channelDetails.subscriberCount,
      videoCount: channelDetails.videoCount,
      viewCount: channelDetails.viewCount,
      hiddenSubscriberCount: channelDetails.hiddenSubscriberCount,
      uploadsPlaylistId: channelDetails.uploadsPlaylistId,
      fetchedAt: new Date(),
    },
    update: {
      channelId: channelDetails.channelId,
      title: channelDetails.title,
      description: channelDetails.description,
      customUrl: channelDetails.customUrl,
      publishedAt: new Date(channelDetails.publishedAt),
      country: channelDetails.country,
      defaultLanguage: channelDetails.defaultLanguage,
      thumbnailDefault: channelDetails.thumbnailDefault,
      thumbnailMedium: channelDetails.thumbnailMedium,
      thumbnailHigh: channelDetails.thumbnailHigh,
      subscriberCount: channelDetails.subscriberCount,
      videoCount: channelDetails.videoCount,
      viewCount: channelDetails.viewCount,
      hiddenSubscriberCount: channelDetails.hiddenSubscriberCount,
      uploadsPlaylistId: channelDetails.uploadsPlaylistId,
      fetchedAt: new Date(),
    },
  });
}

async function checkTopicChannelPlaylists() {
  console.log("🎵 Checking Topic channels...\n");

  const artists = await prisma.artist.findMany({
    where: {
      youtubeChannel: {
        title: { contains: " - Topic" },
      },
    },
    include: {
      youtubeChannel: true,
    },
    take: 50,
  });

  if (artists.length === 0) {
    console.log("✅ No Topic channels found!");
    return;
  }

  console.log(`📊 Found ${artists.length} Topic channels to check\n`);
  console.log(`${"=".repeat(80)}\n`);

  let checkedCount = 0;
  let foundOriginalCount = 0;

  for (let idx = 0; idx < artists.length; idx++) {
    const artist = artists[idx];

    console.log(
      `[${idx + 1}/${artists.length}] 📌 ${artist.name} (${artist.nameKo})`,
    );
    console.log(`   Topic Channel: ${artist.youtubeChannel?.title}`);
    console.log(
      `   Subscribers: ${artist.youtubeChannel?.subscriberCount?.toLocaleString() || "Hidden"}`,
    );

    const topicChannelId = artist.youtubeChannel?.channelId;

    if (!topicChannelId) {
      console.log(`   ⚠️  No channel ID\n`);
      console.log(`${"=".repeat(80)}\n`);
      continue;
    }

    try {
      const playlists = await getPlaylistsFromChannel(topicChannelId, 5);

      if (playlists.length === 0) {
        console.log(`   ⚠️  No playlists found\n`);
        console.log(`${"=".repeat(80)}\n`);
        continue;
      }

      const firstPlaylist = playlists[0];
      const videos = await getVideosFromPlaylist(firstPlaylist.playlistId, 20);

      if (videos.length === 0) {
        console.log(`   ⚠️  No videos found in playlist\n`);
        console.log(`${"=".repeat(80)}\n`);
        continue;
      }

      checkedCount++;

      const channelCount: Record<
        string,
        {
          title: string;
          count: number;
        }
      > = {};

      for (const video of videos) {
        if (!channelCount[video.channelId]) {
          channelCount[video.channelId] = {
            title: video.channelTitle,
            count: 0,
          };
        }
        channelCount[video.channelId].count++;
      }

      const channelStats = Object.entries(channelCount)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([channelId, data]) => ({ channelId, ...data }));

      const originalChannel = channelStats.find(
        (stat) => !stat.title.includes(" - Topic"),
      );

      if (originalChannel && originalChannel.channelId !== topicChannelId) {
        foundOriginalCount++;
        console.log(`   ✨ Found original channel: ${originalChannel.title}`);
        console.log(`   📺 Channel ID: ${originalChannel.channelId}`);
        console.log(
          `   🎬 Videos in playlist: ${originalChannel.count}/${videos.length}`,
        );

        try {
          const channelDetails = await getChannelDetails(
            originalChannel.channelId,
          );
          console.log(
            `   👥 Subscribers: ${channelDetails.subscriberCount?.toLocaleString() || "Hidden"}`,
          );
          console.log(
            `   📹 Total videos: ${channelDetails.videoCount?.toLocaleString() || "Unknown"}`,
          );
          if (channelDetails.customUrl) {
            console.log(`   🔗 URL: ${channelDetails.customUrl}`);
          }

          console.log(`   💾 Updating DB with original channel...`);
          await updateArtistChannel(artist.id, originalChannel.channelId);
          console.log(`   ✅ DB updated successfully!`);
        } catch (error) {
          console.log(`   ⚠️  Could not update channel:`, error);
        }
      } else {
        console.log(`   ℹ️  No original channel found (all from Topic)`);
      }

      console.log("");
      console.log(`${"=".repeat(80)}\n`);
    } catch (error: any) {
      if (
        typeof error.message === "string" &&
        (error.message.includes("403") ||
          error.message.toLowerCase().includes("quota"))
      ) {
        console.error(
          "\n❌ YouTube API quota exceeded. Please try again tomorrow.",
        );
        console.log(
          `\n📊 Summary: Checked ${checkedCount}/${artists.length} channels, found ${foundOriginalCount} original channels\n`,
        );
        return;
      }
      console.error(`   ❌ Error:`, error, "\n");
      console.log(`${"=".repeat(80)}\n`);
    }
  }

  console.log("\n✅ Done!");
  console.log(
    `\n📊 Summary: Checked ${checkedCount}/${artists.length} channels, found ${foundOriginalCount} original channels\n`,
  );
}

if (require.main === module) {
  checkTopicChannelPlaylists()
    .catch((error) => {
      console.error("❌ Fatal error:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}

export default checkTopicChannelPlaylists;
