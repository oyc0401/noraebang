import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { YoutubeService } from '../../youtube/youtube.service';

// pnpm ts-node src/scripts/youtube/fetch-youtube-channel-details.ts

async function updateChannelDetails(batchSize: number = 10, skipExisting: boolean = true) {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const youtubeService = app.get(YoutubeService);

  try {
    console.log('🎬 Starting YouTube channel details fetch...\n');

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
        // YouTube 채널 상세 정보 가져오기 (서비스 사용)
        const channelData = await youtubeService.getChannelDetails(artist.youtubeChannelId);

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
    await app.close();
  }
}

// 스크립트 실행
if (require.main === module) {
  updateChannelDetails(500)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default updateChannelDetails;
