import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// pnpm ts-node src/scripts/fetch-youtube-channel-details.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface ChannelDetails {
  channelId: string;
  title: string;
  description: string;
  customUrl: string | null;
  publishedAt: string;
  country: string | null;
  defaultLanguage: string | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: bigint | null;
  hiddenSubscriberCount: boolean;
  uploadsPlaylistId: string | null;
}

async function fetchChannelDetails(channelId: string): Promise<ChannelDetails | null> {
  if (!YOUTUBE_API_KEY) {
    console.error('❌ YouTube API key not configured');
    return null;
  }

  try {
    const url = `${YOUTUBE_API_BASE_URL}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`   ❌ API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.error(`   ❌ Channel not found: ${channelId}`);
      return null;
    }

    const channel = data.items[0];
    const snippet = channel.snippet;
    const statistics = channel.statistics;
    const contentDetails = channel.contentDetails;
    const thumbnails = snippet.thumbnails;

    return {
      channelId: channel.id,
      title: snippet.title,
      description: snippet.description || '',
      customUrl: snippet.customUrl || null,
      publishedAt: snippet.publishedAt,
      country: snippet.country || null,
      defaultLanguage: snippet.defaultLanguage || null,
      thumbnailDefault: thumbnails.default?.url || null,
      thumbnailMedium: thumbnails.medium?.url || null,
      thumbnailHigh: thumbnails.high?.url || null,
      subscriberCount: statistics.subscriberCount ? parseInt(statistics.subscriberCount) : null,
      videoCount: statistics.videoCount ? parseInt(statistics.videoCount) : null,
      viewCount: statistics.viewCount ? BigInt(statistics.viewCount) : null,
      hiddenSubscriberCount: statistics.hiddenSubscriberCount || false,
      uploadsPlaylistId: contentDetails.relatedPlaylists?.uploads || null,
    };
  } catch (error: any) {
    console.error(`   ❌ Error fetching channel details: ${error.message}`);
    return null;
  }
}

async function updateChannelDetails(batchSize: number = 10, skipExisting: boolean = true) {
  try {
    console.log('🎬 Starting YouTube channel details fetch...\n');

    if (!YOUTUBE_API_KEY) {
      console.error('❌ YouTube API key not found in environment variables');
      console.error('Please set YOUTUBE_API_KEY in your .env file');
      process.exit(1);
    }

    // youtubeChannelId가 있는 아티스트만 조회
    const artists = await prisma.artist.findMany({
      where: {
        youtubeChannelId: { not: null },
      },
      include: {
        youtubeChannel: true,
      },
      take: batchSize,
    });

    console.log(`Found ${artists.length} artists with YouTube channel IDs\n`);

    if (artists.length === 0) {
      console.log('✅ No artists with YouTube channel IDs found!');
      return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const artist of artists) {
      console.log(`📌 Processing: ${artist.name} (${artist.nameKo})`);

      // 이미 채널 정보가 있으면 스킵
      if (skipExisting && artist.youtubeChannel) {
        console.log(`   ⏭️  Already exists, skipping...`);
        skipped++;
        console.log('');
        continue;
      }

      if (!artist.youtubeChannelId) {
        console.log(`   ⚠️  No channel ID`);
        skipped++;
        console.log('');
        continue;
      }

      try {
        // YouTube 채널 상세 정보 가져오기
        const channelData = await fetchChannelDetails(artist.youtubeChannelId);

        if (!channelData) {
          console.log(`   ⚠️  Failed to fetch channel details`);
          errors++;
          console.log('');
          continue;
        }

        console.log(`   ✅ Found: ${channelData.title}`);
        console.log(`   📊 Subscribers: ${channelData.subscriberCount?.toLocaleString() || 'Hidden'}`);
        console.log(`   🎥 Videos: ${channelData.videoCount?.toLocaleString() || 'N/A'}`);

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

        console.log(`   💾 Saved successfully`);
        created++;

        // YouTube API rate limit을 고려한 딜레이 (200ms)
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        // 403 에러 (쿼터 초과)가 발생하면 중단
        if (error.message?.includes('403') || error.message?.includes('quota')) {
          console.error('\n❌ YouTube API quota exceeded. Please try again tomorrow.');
          console.error('💡 Tip: You can continue from where you left off by running this script again.');
          break;
        }
        console.error(`   ❌ Error processing ${artist.name}:`, error.message);
        errors++;
      }

      console.log('');
    }

    console.log('📊 Summary:');
    console.log(`   Total processed: ${artists.length}`);
    console.log(`   Created/Updated: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);

    // 남은 아티스트 확인
    const remaining = await prisma.artist.count({
      where: {
        youtubeChannelId: { not: null },
        youtubeChannel: null,
      },
    });

    if (remaining > 0) {
      console.log(`\n⚠️  ${remaining} artists still need YouTube channel details`);
      console.log('💡 Run this script again to continue');
    } else {
      console.log('\n✅ All artists with channel IDs have channel details!');
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  updateChannelDetails(500)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default updateChannelDetails;
