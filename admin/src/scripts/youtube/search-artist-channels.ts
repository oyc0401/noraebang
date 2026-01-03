import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { ChannelType, PrismaClient } from "@prisma/client";
import pg from "pg";
import { pathToFileURL } from "url";
import {
  getYoutubeApiKey,
  rotateYoutubeApiKey,
} from "../../lib/youtube-key-manager.ts";

// pnpm ts-node src/scripts/youtube/search-artist-channels.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

function isQuotaErrorPayload(payload: any): boolean {
  const reason = payload?.error?.errors?.[0]?.reason;
  if (reason) {
    return [
      "quotaExceeded",
      "dailyLimitExceeded",
      "userRateLimitExceeded",
      "rateLimitExceeded",
    ].includes(reason);
  }

  const message: string | undefined = payload?.error?.message;
  return typeof message === "string" && message.toLowerCase().includes("quota");
}

async function fetchYoutubeJson(buildUrl: (apiKey: string) => string) {
  while (true) {
    const apiKey = getYoutubeApiKey();
    const response = await fetch(buildUrl(apiKey));
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // ignore JSON parse errors for non-JSON responses
    }

    if (response.ok) {
      return data;
    }

    if (response.status === 403 && isQuotaErrorPayload(data)) {
      console.warn("   ⛔️ Quota exceeded for current API key.");
      if (rotateYoutubeApiKey()) {
        console.log("   🔁 Retrying request with fallback API key...");
        continue;
      }
    }

    throw new Error(
      `YouTube API error: ${data?.error?.message || response.statusText}`,
    );
  }
}

function isTopicChannelTitle(title?: string | null): boolean {
  if (!title) {
    return false;
  }
  return title.toLowerCase().endsWith(" - topic");
}

async function searchChannels(query: string): Promise<ChannelSearchResult[]> {
  const data = await fetchYoutubeJson((apiKey) => {
    const params = new URLSearchParams({
      part: "snippet",
      type: "channel",
      q: query,
      maxResults: "5",
      key: apiKey,
    });
    return `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  });

  if (!data.items || data.items.length === 0) {
    return [];
  }

  // 각 채널의 상세 정보 가져오기 (구독자 수 포함)
  const channelIds = data.items
    .map((item: any) => item.snippet.channelId)
    .join(",");

  const detailsData = await fetchYoutubeJson((apiKey) => {
    const params = new URLSearchParams({
      part: "snippet,statistics",
      id: channelIds,
      key: apiKey,
    });
    return `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`;
  });

  return detailsData.items.map((item: any) => ({
    channelId: item.id,
    title: item.snippet.title,
    description: item.snippet.description || "",
    subscriberCount: item.statistics?.subscriberCount
      ? parseInt(item.statistics.subscriberCount)
      : undefined,
  }));
}

async function getChannelDetails(channelId: string): Promise<YoutubeChannelDetails> {
  const data = await fetchYoutubeJson((apiKey) => {
    const params = new URLSearchParams({
      part: "snippet,statistics,contentDetails",
      id: channelId,
      key: apiKey,
    });
    return `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`;
  });

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

function selectBestChannel(
  channels: ChannelSearchResult[],
): ChannelSearchResult | null {
  if (!channels || channels.length === 0) {
    return null;
  }

  const topicChannel = channels.find((channel) =>
    isTopicChannelTitle(channel.title),
  );

  if (topicChannel) {
    console.log(`   🎯 Topic channel found: ${topicChannel.title}`);
    return topicChannel;
  }

  console.log(`   ⚠️  No topic channel found in results`);
  return null;
}

async function getDefaultStartArtistId(): Promise<number> {
  const latestTopicChannel = await prisma.youtubeChannel.findFirst({
    where: { type: ChannelType.TOPIC },
    orderBy: { artistId: "desc" },
    select: { artistId: true },
  });

  if (!latestTopicChannel) {
    return 1;
  }

  return latestTopicChannel.artistId + 1;
}

interface SearchOptions {
  batchSize?: number | null;
  startId?: number | null;
}

async function searchArtistChannels(options?: SearchOptions) {
  try {
    console.log("🎵 Starting YouTube channel search...\n");

    const desiredStartId =
      options?.startId && options.startId > 0
        ? options.startId
        : await getDefaultStartArtistId();

    console.log(`➡️  Processing artists with id >= ${desiredStartId}`);

    // 업데이트가 필요한 아티스트만 조회
    const artists = await prisma.artist.findMany({
      where: {
        id: {
          gte: desiredStartId,
        },
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
        artistSongs: {
          take: 1,
          orderBy: { order: "asc" },
          include: {
            song: true,
          },
        },
        youtubeChannels: true,
      },
      orderBy: { id: "asc" },
      take: options?.batchSize ?? undefined,
    });

    console.log(`Found ${artists.length} artists to update\n`);

    if (artists.length === 0) {
      console.log("✅ All artists already have YouTube channel data!");
      return;
    }

    let updated = 0;
    let notFound = 0;
    let errors = 0;
    let lastProcessedId: number | null = null;

    for (const artist of artists) {
      const mainChannel = artist.youtubeChannels.find(
        (channel) => channel.type === ChannelType.MAIN,
      );
      const statusPrefix = "📌 Processing (searching topic channel)";

      console.log(`${statusPrefix}: ${artist.name} (${artist.nameKo})`);
      if (mainChannel) {
        console.log(
          `   Existing main channel: ${mainChannel.title} (${mainChannel.channelId})`,
        );
      }

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

        console.log(`   ✅ Selected topic channel: ${channelData.title}`);
        console.log(
          `   📊 Subscribers: ${channelData.subscriberCount?.toLocaleString() || "Hidden"}`,
        );
        console.log(
          `   📝 Description: ${channelData.description.substring(0, 50)}...`,
        );

        // 채널 상세 정보 가져오기
        const detailedChannelData = await getChannelDetails(channelData.channelId);

        // YoutubeChannel 테이블 upsert
        await prisma.youtubeChannel.upsert({
          where: {
            artistId_type: {
              artistId: artist.id,
              type: ChannelType.TOPIC,
            },
          },
          create: {
            artistId: artist.id,
            type: ChannelType.TOPIC,
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
            type: ChannelType.TOPIC,
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
        lastProcessedId = artist.id;

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
          if (lastProcessedId) {
            console.error(
              `⚠️  Last processed artist ID: ${lastProcessedId}. Use this value when restarting.`,
            );
          }
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
    });

    if (remaining > 0) {
      console.log(
        `\n⚠️  ${remaining} artists still need topic channel data`,
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
const isDirectExecution =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  const startIdArg = process.argv[2];
  const limitArg = process.argv[3];
  const startId = startIdArg ? Number(startIdArg) : undefined;
  const batchSize = limitArg ? Number(limitArg) : undefined;

  searchArtistChannels({ startId, batchSize })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
