import 'dotenv/config';
import { PrismaClient, Provider } from '@prisma/client';
import { BlogScrapeService } from '../blog-scrape/blog-scrape.service';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// pnpm ts-node src/scripts/update-youtube-channels.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeChannelResult {
  channelId: string;
  channelUrl: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
}

async function searchArtistChannel(artistName: string): Promise<YouTubeChannelResult | null> {
  if (!YOUTUBE_API_KEY) {
    console.error('❌ YouTube API key not configured');
    return null;
  }

  try {
    const url = `${YOUTUBE_API_BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(artistName)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`   ❌ API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // console.log('\n=== YouTube API Response ===');
    // console.log(JSON.stringify(data, null, 2));
    // console.log('=========================\n');

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const channel = data.items[0];
    const thumbnails = channel.snippet.thumbnails;

    return {
      channelId: channel.id.channelId,
      channelUrl: `https://www.youtube.com/channel/${channel.id.channelId}`,
      title: channel.snippet.title,
      description: channel.snippet.description,
      publishedAt: channel.snippet.publishedAt,
      thumbnail: thumbnails.high?.url || thumbnails.default?.url || '',
      thumbnailDefault: thumbnails.default?.url || null,
      thumbnailMedium: thumbnails.medium?.url || null,
      thumbnailHigh: thumbnails.high?.url || null,
    };
  } catch (error: any) {
    console.error(`   ❌ Error searching channel: ${error.message}`);
    return null;
  }
}

async function updateYouTubeChannels(batchSize: number = 1, skipExisting: boolean = true) {
  try {
    console.log('🎵 Starting YouTube channel update...\n');

    if (!YOUTUBE_API_KEY) {
      console.error('❌ YouTube API key not found in environment variables');
      console.error('Please set YOUTUBE_API_KEY in your .env file');
      process.exit(1);
    }

    // 업데이트가 필요한 아티스트만 조회 (채널 ID가 없는 경우)
    const whereClause = skipExisting
      ? { youtubeChannelId: null }
      : {};

    // 우선순위: 1) youtubeThumbnail 없음, 2) youtubeThumbnailDefault 없음, 3) 가장 오래된 업데이트
    // const whereClause = skipExisting
    //   ? {
    //       OR: [
    //         { youtubeThumbnail: null },
    //         { youtubeThumbnailDefault: null },
    //       ]
    //     }
    //   : {};

    const artists = await prisma.artist.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      // orderBy: [
      //   { youtubeThumbnail: 'asc' },  // null이 먼저 (asc에서 null이 앞)
      //   { youtubeThumbnailDefault: 'asc' },
      //   { youtubeFetchedAt: 'asc' },  // 가장 오래된 것부터
      // ],
      take: batchSize, // 한 번에 처리할 개수 제한
    });

    console.log(`Found ${artists.length} artists to update\n`);

    if (artists.length === 0) {
      console.log('✅ All artists already have YouTube channel data!');
      return;
    }

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const artist of artists) {
      console.log(`📌 Processing: ${artist.name} (${artist.nameKo})`);

      try {
        // YouTube 채널 검색
        const channelData = await searchArtistChannel(artist.name);

        if (!channelData) {
          console.log(`   ⚠️  Channel not found`);
          notFound++;
          continue;
        }

        console.log(`   ✅ Found: ${channelData.title}`);
        console.log(`   🔗 URL: ${channelData.channelUrl}`);
        console.log(`   📝 Description: ${channelData.description.substring(0, 50)}...`);
        console.log(`   🖼️  Thumbnail: ${channelData.thumbnail}`);

        // 아티스트에는 채널 ID만 저장
        await prisma.artist.update({
          where: { id: artist.id },
          data: {
            youtubeChannelId: channelData.channelId,
          },
        });

        console.log(`   💾 Channel ID saved successfully`);
        updated++;

        // YouTube API rate limit을 고려한 딜레이 (1초)
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
    console.log(`   Updated: ${updated}`);
    console.log(`   Not found: ${notFound}`);
    console.log(`   Errors: ${errors}`);

    // 남은 아티스트 확인
    const remaining = await prisma.artist.count({
      where: { youtubeChannelId: null },
    });

    // const remaining = await prisma.artist.count({
    //   where: {
    //     OR: [
    //       { youtubeThumbnail: null },
    //       { youtubeThumbnailDefault: null },
    //     ]
    //   },
    // });

    if (remaining > 0) {
      console.log(`\n⚠️  ${remaining} artists still need YouTube channel data`);
      console.log('💡 Run this script again to continue updating');
    } else {
      console.log('\n✅ All artists have YouTube channel data!');
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
  updateYouTubeChannels(50)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default updateYouTubeChannels;
