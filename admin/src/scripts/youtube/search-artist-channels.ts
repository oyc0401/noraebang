import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// pnpm ts-node src/scripts/youtube/search-artist-channels.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  throw new Error("YOUTUBE_API_KEY is not set");
}

interface ChannelSearchResult {
  channelId: string;
  title: string;
  description: string;
  subscriberCount?: number;
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

async function searchChannels(query: string): Promise<ChannelSearchResult[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=5&key=${YOUTUBE_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`YouTube API error: ${data.error?.message || response.statusText}`);
  }

  if (!data.items || data.items.length === 0) {
    return [];
  }

  // 각 채널의 상세 정보 가져오기 (구독자 수 포함)
  const channelIds = data.items.map((item: any) => item.snippet.channelId).join(',');
  const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${YOUTUBE_API_KEY}`;

  const detailsResponse = await fetch(detailsUrl);
  const detailsData = await detailsResponse.json();

  if (!detailsResponse.ok) {
    throw new Error(`YouTube API error: ${detailsData.error?.message || detailsResponse.statusText}`);
  }

  return detailsData.items.map((item: any) => ({
    channelId: item.id,
    title: item.snippet.title,
    description: item.snippet.description || '',
    subscriberCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount) : undefined,
  }));
}

async function getChannelDetails(channelId: string): Promise<YoutubeChannelDetails> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(channelId)}&key=${YOUTUBE_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`YouTube API error: ${data.error?.message || response.statusText}`);
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
    subscriberCount: statistics?.subscriberCount ? parseInt(statistics.subscriberCount) : undefined,
    videoCount: statistics?.videoCount ? parseInt(statistics.videoCount) : undefined,
    viewCount: statistics?.viewCount ? BigInt(statistics.viewCount) : undefined,
    hiddenSubscriberCount: statistics?.hiddenSubscriberCount,
    uploadsPlaylistId: contentDetails?.relatedPlaylists?.uploads,
  };
}

function selectBestChannel(channels: ChannelSearchResult[]): ChannelSearchResult | null {
  if (!channels || channels.length === 0) {
    return null;
  }

  // Topic 채널 제외
  const nonTopicChannels = channels.filter(
    (channel) => !channel.title.includes(" - Topic"),
  );

  if (nonTopicChannels.length === 0) {
    console.log(`   ⚠️  Only Topic channels found, using first result`);
    return channels[0];
  }

  // 구독자 수로 정렬 (내림차순)
  const sortedChannels = nonTopicChannels
    .filter((channel) => channel.subscriberCount !== null)
    .sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0));

  // 상위 3개 중 첫 번째 (가장 구독자 많은)
  const topChannels = sortedChannels.slice(0, 3);

  if (topChannels.length > 1) {
    console.log(`   📊 Top ${topChannels.length} candidates:`);
    topChannels.forEach((ch, idx) => {
      console.log(
        `      ${idx + 1}. ${ch.title} - ${ch.subscriberCount?.toLocaleString()} subscribers`,
      );
    });
  }

  return topChannels[0] || nonTopicChannels[0];
}

async function searchArtistChannels(
  batchSize: number = 1,
  skipExisting: boolean = true,
) {
  try {
    console.log("🎵 Starting YouTube channel search...\n");

    // 업데이트가 필요한 아티스트만 조회
    const whereClause = skipExisting
      ? {
          OR: [
            { youtubeChannel: null },
            { youtubeChannel: { title: { contains: " - Topic" } } },
          ],
        }
      : {};

    const artists = await prisma.artist.findMany({
      where: whereClause,
      include: {
        artistSongs: {
          take: 1,
          orderBy: { order: "asc" },
          include: {
            song: true,
          },
        },
        youtubeChannel: true,
      },
      orderBy: { name: "asc" },
      take: batchSize,
    });

    console.log(`Found ${artists.length} artists to update\n`);

    if (artists.length === 0) {
      console.log("✅ All artists already have YouTube channel data!");
      return;
    }

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const artist of artists) {
      const isTopicChannel = artist.youtubeChannel?.title?.includes(" - Topic");
      const statusPrefix = isTopicChannel
        ? "🔄 Re-searching (Topic channel)"
        : "📌 Processing";

      console.log(`${statusPrefix}: ${artist.name} (${artist.nameKo})`);

      try {
        // 검색어: 아티스트명 + 대표곡명
        let searchQuery = artist.name;
        if (artist.artistSongs.length > 0 && artist.artistSongs[0].song) {
          const topSong = artist.artistSongs[0].song;
          searchQuery = `${artist.name} ${topSong.title}`;
          console.log(`   🔍 Search: "${searchQuery}"`);
        } else {
          console.log(`   🔍 Search: "${searchQuery}" (no songs found)`);
        }

        const channels = await searchChannels(searchQuery);

        if (!channels || channels.length === 0) {
          console.log(`   ⚠️  Channel not found`);
          notFound++;
          console.log("");
          continue;
        }

        // 최적의 채널 선택
        const channelData = selectBestChannel(channels);

        if (!channelData) {
          console.log(`   ⚠️  No suitable channel found`);
          notFound++;
          console.log("");
          continue;
        }

        console.log(`   ✅ Selected: ${channelData.title}`);
        console.log(
          `   📊 Subscribers: ${channelData.subscriberCount?.toLocaleString() || "Hidden"}`,
        );
        console.log(
          `   📝 Description: ${channelData.description.substring(0, 50)}...`,
        );

        // 기존 채널이 토픽 채널인 경우, 구독자 수 비교
        if (isTopicChannel && artist.youtubeChannel?.subscriberCount) {
          const existingSubscribers = artist.youtubeChannel.subscriberCount;
          const newSubscribers = channelData.subscriberCount || 0;

          if (newSubscribers < existingSubscribers) {
            console.log(`   ⏭️  Skipping: New channel has fewer subscribers`);
            console.log(
              `      Existing: ${existingSubscribers.toLocaleString()}`,
            );
            console.log(`      New: ${newSubscribers.toLocaleString()}`);
            notFound++;
            console.log("");
            continue;
          } else {
            console.log(`   ✨ Upgrading: New channel has more subscribers`);
            console.log(
              `      Old (Topic): ${existingSubscribers.toLocaleString()}`,
            );
            console.log(`      New: ${newSubscribers.toLocaleString()}`);
          }
        }

        // 채널 상세 정보 가져오기
        const detailedChannelData = await getChannelDetails(channelData.channelId);

        // Artist 업데이트 (썸네일만)
        await prisma.artist.update({
          where: { id: artist.id },
          data: {
            thumbnailDefault: detailedChannelData.thumbnailDefault,
            thumbnailMedium: detailedChannelData.thumbnailMedium,
            thumbnailHigh: detailedChannelData.thumbnailHigh,
          },
        });

        // YoutubeChannel 테이블 upsert
        await prisma.youtubeChannel.upsert({
          where: { artistId: artist.id },
          create: {
            artistId: artist.id,
            channelId: detailedChannelData.channelId,
            title: detailedChannelData.title,
            description: detailedChannelData.description,
            customUrl: detailedChannelData.customUrl,
            publishedAt: new Date(detailedChannelData.publishedAt),
            country: detailedChannelData.country,
            defaultLanguage: detailedChannelData.defaultLanguage,
            thumbnailDefault: detailedChannelData.thumbnailDefault,
            thumbnailMedium: detailedChannelData.thumbnailMedium,
            thumbnailHigh: detailedChannelData.thumbnailHigh,
            subscriberCount: detailedChannelData.subscriberCount,
            videoCount: detailedChannelData.videoCount,
            viewCount: detailedChannelData.viewCount,
            hiddenSubscriberCount: detailedChannelData.hiddenSubscriberCount,
            uploadsPlaylistId: detailedChannelData.uploadsPlaylistId,
            fetchedAt: new Date(),
          },
          update: {
            channelId: detailedChannelData.channelId,
            title: detailedChannelData.title,
            description: detailedChannelData.description,
            customUrl: detailedChannelData.customUrl,
            publishedAt: new Date(detailedChannelData.publishedAt),
            country: detailedChannelData.country,
            defaultLanguage: detailedChannelData.defaultLanguage,
            thumbnailDefault: detailedChannelData.thumbnailDefault,
            thumbnailMedium: detailedChannelData.thumbnailMedium,
            thumbnailHigh: detailedChannelData.thumbnailHigh,
            subscriberCount: detailedChannelData.subscriberCount,
            videoCount: detailedChannelData.videoCount,
            viewCount: detailedChannelData.viewCount,
            hiddenSubscriberCount: detailedChannelData.hiddenSubscriberCount,
            uploadsPlaylistId: detailedChannelData.uploadsPlaylistId,
            fetchedAt: new Date(),
          },
        });

        console.log(`   💾 Channel data saved successfully`);
        updated++;

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
    console.log(`   Updated: ${updated}`);
    console.log(`   Not found: ${notFound}`);
    console.log(`   Errors: ${errors}`);

    // 남은 아티스트 확인
    const remaining = await prisma.artist.count({
      where: {
        OR: [
          { youtubeChannel: null },
          { youtubeChannel: { title: { contains: " - Topic" } } },
        ],
      },
    });

    if (remaining > 0) {
      console.log(
        `\n⚠️  ${remaining} artists still need YouTube channel data (or have Topic channels)`,
      );
      console.log("💡 Run this script again to continue updating");
    } else {
      console.log("\n✅ All artists have proper YouTube channel data!");
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
  searchArtistChannels(50)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
