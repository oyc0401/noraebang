import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { ChannelType, PrismaClient } from "@prisma/client";
import pg from "pg";
import { pathToFileURL } from "url";
import {
  fetchYoutubeChannel,
  searchYoutubeChannels,
} from "../../thirdparty/youtube/index.ts";

// pnpm ts-node src/scripts/youtube/search-artist-channels.ts
// pnpm ts-node src/scripts/youtube/search-artist-channels.ts [startId] [limit]

// 여기까지 체크함: 870
//

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

function isTopicChannelTitle(title?: string | null): boolean {
  if (!title) {
    return false;
  }
  return title.toLowerCase().endsWith(" - topic");
}

function stripTopicSuffix(title: string): string {
  return title.replace(/ - topic$/i, "").trim();
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

async function searchChannels(query: string): Promise<ChannelSearchResult[]> {
  const data = await searchYoutubeChannels(query, 3);
  if (!data.items || data.items.length === 0) {
    return [];
  }

  const results: ChannelSearchResult[] = [];

  for (const item of data.items) {
    const channelId =
      typeof item.id === "string" ? item.id : item.id?.channelId;
    if (!channelId) continue;

    const channelData = await fetchYoutubeChannel({ channelId });
    const channel = channelData.items?.[0];
    if (!channel) continue;

    const snippet = channel.snippet ?? {};
    const statistics = channel.statistics ?? {};
    results.push({
      channelId: channel.id,
      title: (snippet.title as string) ?? "",
      description: (snippet.description as string) ?? "",
      subscriberCount: statistics?.subscriberCount
        ? parseInt(statistics.subscriberCount as string)
        : undefined,
    });
  }

  return results;
}

async function getChannelDetails(
  channelId: string,
): Promise<YoutubeChannelDetails> {
  const data = await fetchYoutubeChannel({ channelId });
  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const channel = data.items[0];
  const snippet = channel.snippet ?? {};
  const statistics = channel.statistics ?? {};
  const contentDetails = channel.contentDetails as
    | { relatedPlaylists?: { uploads?: string } }
    | undefined;
  const thumbnails = (snippet as any)?.thumbnails ?? {};

  return {
    channelId: channel.id,
    title: (snippet as any).title,
    description: (snippet as any).description,
    customUrl: (snippet as any).customUrl,
    publishedAt: (snippet as any).publishedAt,
    country: (snippet as any).country,
    defaultLanguage: (snippet as any).defaultLanguage,
    thumbnailDefault: thumbnails?.default?.url,
    thumbnailMedium: thumbnails?.medium?.url,
    thumbnailHigh: thumbnails?.high?.url,
    subscriberCount: statistics?.subscriberCount
      ? parseInt(statistics.subscriberCount as string)
      : undefined,
    videoCount: statistics?.videoCount
      ? parseInt(statistics.videoCount as string)
      : undefined,
    viewCount: statistics?.viewCount
      ? BigInt(statistics.viewCount as string)
      : undefined,
    hiddenSubscriberCount:
      typeof statistics?.hiddenSubscriberCount === "boolean"
        ? statistics.hiddenSubscriberCount
        : undefined,
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
    let promotedMainChannels = 0;
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
        const searchQuery = artist.name;
        console.log(`   🔍 Search: "${searchQuery}"`);

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
        const detailedChannelData = await getChannelDetails(
          channelData.channelId,
        );

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

        const baseTitle = stripTopicSuffix(channelData.title);
        const normalizedBaseTitle = normalizeTitle(baseTitle);
        const mainCandidate = channels.find(
          (candidate) =>
            !isTopicChannelTitle(candidate.title) &&
            normalizeTitle(candidate.title) === normalizedBaseTitle,
        );

        const topicSubscribers = channelData.subscriberCount ?? 0;
        const mainSubscribers = mainCandidate?.subscriberCount ?? 0;

        if (mainCandidate && mainSubscribers > topicSubscribers) {
          console.log(
            `   📈 Found possible main channel "${mainCandidate.title}" (${mainSubscribers.toLocaleString()} subs)`,
          );

          const mainChannelDetails = await getChannelDetails(
            mainCandidate.channelId,
          );

          await prisma.youtubeChannel.upsert({
            where: {
              artistId_type: {
                artistId: artist.id,
                type: ChannelType.MAIN,
              },
            },
            create: {
              artistId: artist.id,
              type: ChannelType.MAIN,
              channelId: mainChannelDetails.channelId,
              title: mainChannelDetails.title,
              description: mainChannelDetails.description,
              customUrl: mainChannelDetails.customUrl,
              publishedAt: new Date(mainChannelDetails.publishedAt),
              country: mainChannelDetails.country,
              defaultLanguage: mainChannelDetails.defaultLanguage,
              thumbnailDefault: mainChannelDetails.thumbnailDefault,
              thumbnailMedium: mainChannelDetails.thumbnailMedium,
              thumbnailHigh: mainChannelDetails.thumbnailHigh,
              subscriberCount: mainChannelDetails.subscriberCount,
              videoCount: mainChannelDetails.videoCount,
              viewCount: mainChannelDetails.viewCount,
              hiddenSubscriberCount: mainChannelDetails.hiddenSubscriberCount,
              uploadsPlaylistId: mainChannelDetails.uploadsPlaylistId,
              fetchedAt: new Date(),
            },
            update: {
              channelId: mainChannelDetails.channelId,
              title: mainChannelDetails.title,
              description: mainChannelDetails.description,
              customUrl: mainChannelDetails.customUrl,
              publishedAt: new Date(mainChannelDetails.publishedAt),
              country: mainChannelDetails.country,
              defaultLanguage: mainChannelDetails.defaultLanguage,
              thumbnailDefault: mainChannelDetails.thumbnailDefault,
              thumbnailMedium: mainChannelDetails.thumbnailMedium,
              thumbnailHigh: mainChannelDetails.thumbnailHigh,
              subscriberCount: mainChannelDetails.subscriberCount,
              videoCount: mainChannelDetails.videoCount,
              viewCount: mainChannelDetails.viewCount,
              hiddenSubscriberCount: mainChannelDetails.hiddenSubscriberCount,
              uploadsPlaylistId: mainChannelDetails.uploadsPlaylistId,
              fetchedAt: new Date(),
            },
          });

          promotedMainChannels += 1;
          console.log(
            "   ⭐️ Main channel saved/updated because it has more subscribers than the Topic channel.",
          );
        }

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
    if (promotedMainChannels > 0) {
      console.log(`   Main channels promoted: ${promotedMainChannels}`);
    }

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
      console.log(`\n⚠️  ${remaining} artists still need topic channel data`);
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
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  const startIdArg = process.argv[2];
  const limitArg = process.argv[3];
  const startId = startIdArg ? Number(startIdArg) : undefined;
  const batchSize = limitArg ? Number(limitArg) : undefined;

  searchArtistChannels({ startId, batchSize })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
