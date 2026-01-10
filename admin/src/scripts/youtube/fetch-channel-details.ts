import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// pnpm ts-node src/scripts/youtube/fetch-channel-details.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  throw new Error("YOUTUBE_API_KEY is not set");
}

interface YoutubeChannelDetails {
  channelId: string;
  title: string;
  description?: string;
  customUrl?: string;
  publishedAt: string;
  country?: string;
  defaultLanguage?: string;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: bigint;
  hiddenSubscriberCount?: boolean;
  uploadsPlaylistId?: string;
}

async function getChannelDetails(
  channelId: string,
): Promise<YoutubeChannelDetails> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(channelId)}&key=${YOUTUBE_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `YouTube API error: ${data.error?.message || response.statusText}`,
    );
  }

  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const channel = data.items[0];
  const snippet = channel.snippet;
  const statistics = channel.statistics;
  const contentDetails = channel.contentDetails;

  return {
    channelId: channel.id,
    title: snippet.title,
    description: snippet.description,
    customUrl: snippet.customUrl,
    publishedAt: snippet.publishedAt,
    country: snippet.country,
    defaultLanguage: snippet.defaultLanguage,
    thumbnailDefault: snippet.thumbnails?.default?.url,
    thumbnailMedium: snippet.thumbnails?.medium?.url,
    thumbnailHigh: snippet.thumbnails?.high?.url,
    subscriberCount: statistics?.subscriberCount
      ? parseInt(statistics.subscriberCount)
      : undefined,
    videoCount: statistics?.videoCount
      ? parseInt(statistics.videoCount)
      : undefined,
    viewCount: statistics?.viewCount ? BigInt(statistics.viewCount) : undefined,
    hiddenSubscriberCount: statistics?.hiddenSubscriberCount,
    uploadsPlaylistId: contentDetails?.relatedPlaylists?.uploads,
  };
}

async function updateChannelDetails(
  batchSize: number = 10,
  skipExisting: boolean = true,
) {
  try {
    console.log("🎬 Starting YouTube channel details fetch...\n");

    // Topic 채널 갱신 또는 모든 채널 갱신
    const artists = await prisma.artist.findMany({
      where: skipExisting
        ? {
            youtubeChannel: {
              title: { contains: " - Topic" },
            },
          }
        : {
            youtubeChannel: {
              isNot: null,
            },
          },
      include: {
        youtubeChannel: true,
      },
      take: batchSize,
    });

    console.log(`Found ${artists.length} artists to process\n`);

    if (artists.length === 0) {
      console.log("✅ All artists have proper channel details!");
      return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const artist of artists) {
      const isTopic = artist.youtubeChannel?.title?.includes(" - Topic");
      console.log(
        `📌 Processing: ${artist.name} (${artist.nameKo})${isTopic ? " [Topic]" : ""}`,
      );

      // 공식 채널이 이미 있으면 스킵
      if (skipExisting && artist.youtubeChannel && !isTopic) {
        console.log(`   ⏭️  Already has official channel, skipping...`);
        skipped++;
        console.log("");
        continue;
      }

      if (!artist.youtubeChannel?.channelId) {
        console.log(`   ⚠️  No channel ID`);
        skipped++;
        console.log("");
        continue;
      }

      try {
        const channelData = await getChannelDetails(
          artist.youtubeChannel.channelId,
        );

        console.log(`   ✅ Found: ${channelData.title}`);
        console.log(
          `   📊 Subscribers: ${channelData.subscriberCount?.toLocaleString() || "Hidden"}`,
        );
        console.log(
          `   🎥 Videos: ${channelData.videoCount?.toLocaleString() || "N/A"}`,
        );

        // YoutubeChannel 레코드 생성 또는 업데이트
        await prisma.youtubeChannel.upsert({
          where: { artistId: artist.id },
          create: {
            artistId: artist.id,
            channelId: channelData.channelId,
            title: channelData.title,
            description: channelData.description,
            customUrl: channelData.customUrl,
            publishedAt: new Date(channelData.publishedAt),
            country: channelData.country,
            defaultLanguage: channelData.defaultLanguage,
            thumbnailDefault: channelData.thumbnailDefault,
            thumbnailMedium: channelData.thumbnailMedium,
            thumbnailHigh: channelData.thumbnailHigh,
            subscriberCount: channelData.subscriberCount,
            videoCount: channelData.videoCount,
            viewCount: channelData.viewCount,
            hiddenSubscriberCount: channelData.hiddenSubscriberCount,
            uploadsPlaylistId: channelData.uploadsPlaylistId,
            fetchedAt: new Date(),
          },
          update: {
            channelId: channelData.channelId,
            title: channelData.title,
            description: channelData.description,
            customUrl: channelData.customUrl,
            publishedAt: new Date(channelData.publishedAt),
            country: channelData.country,
            defaultLanguage: channelData.defaultLanguage,
            thumbnailDefault: channelData.thumbnailDefault,
            thumbnailMedium: channelData.thumbnailMedium,
            thumbnailHigh: channelData.thumbnailHigh,
            subscriberCount: channelData.subscriberCount,
            videoCount: channelData.videoCount,
            viewCount: channelData.viewCount,
            hiddenSubscriberCount: channelData.hiddenSubscriberCount,
            uploadsPlaylistId: channelData.uploadsPlaylistId,
            fetchedAt: new Date(),
          },
        });

        // Artist 썸네일 동기화
        await prisma.artist.update({
          where: { id: artist.id },
          data: {
            thumbnailDefault: channelData.thumbnailDefault,
            thumbnailMedium: channelData.thumbnailMedium,
            thumbnailHigh: channelData.thumbnailHigh,
          },
        });

        console.log(`   💾 Saved successfully`);
        created++;

        // YouTube API rate limit을 고려한 딜레이 (200ms)
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        // 403 에러 (쿼터 초과)가 발생하면 중단
        if (
          error instanceof Error &&
          (error.message.includes("403") || error.message.includes("quota"))
        ) {
          console.error(
            "\n❌ YouTube API quota exceeded. Please try again tomorrow.",
          );
          console.error(
            "💡 Tip: You can continue from where you left off by running this script again.",
          );
          break;
        }
        console.error(`   ❌ Error processing ${artist.name}:`, error);
        errors++;
      }

      console.log("");
    }

    console.log("📊 Summary:");
    console.log(`   Total processed: ${artists.length}`);
    console.log(`   Created/Updated: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);

    // 남은 아티스트 확인
    const remainingTopicChannels = await prisma.artist.count({
      where: {
        youtubeChannel: {
          title: { contains: " - Topic" },
        },
      },
    });

    if (remainingTopicChannels > 0) {
      console.log(`\n⚠️  Remaining artists:`);
      console.log(`   - Topic channels: ${remainingTopicChannels}`);
      console.log("💡 Run this script again to continue");
    } else {
      console.log("\n✅ All artists have proper channel details!");
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// 스크립트 실행
if (require.main === module) {
  updateChannelDetails(500)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
