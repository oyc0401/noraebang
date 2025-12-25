import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { YoutubeService } from '../../youtube/youtube.service';

// pnpm ts-node src/scripts/youtube/update-youtube-channels.ts

async function updateYouTubeChannels(batchSize: number = 1, skipExisting: boolean = true) {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const youtubeService = app.get(YoutubeService);

  try {
    console.log('🎵 Starting YouTube channel update...\n');

    // 업데이트가 필요한 아티스트만 조회 (채널 ID가 없는 경우)
    const whereClause = skipExisting
      ? { youtubeChannelId: null }
      : {};

    const artists = await prisma.artist.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      take: batchSize,
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
        // YouTube 채널 검색 (서비스 사용)
        const channels = await youtubeService.searchChannels(artist.name);

        if (!channels || channels.length === 0) {
          console.log(`   ⚠️  Channel not found`);
          notFound++;
          continue;
        }

        // 첫 번째 결과 사용 (가장 관련성 높음)
        const channelData = channels[0];

        console.log(`   ✅ Found: ${channelData.title}`);
        console.log(`   📊 Subscribers: ${channelData.subscriberCount?.toLocaleString() || 'Hidden'}`);
        console.log(`   📝 Description: ${channelData.description.substring(0, 50)}...`);

        // 아티스트에는 채널 ID만 저장
        await prisma.artist.update({
          where: { id: artist.id },
          data: {
            youtubeChannelId: channelData.channelId,
          },
        });

        console.log(`   💾 Channel ID saved successfully`);
        updated++;

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
    console.log(`   Updated: ${updated}`);
    console.log(`   Not found: ${notFound}`);
    console.log(`   Errors: ${errors}`);

    // 남은 아티스트 확인
    const remaining = await prisma.artist.count({
      where: { youtubeChannelId: null },
    });

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
    await app.close();
  }
}

// 스크립트 실행
if (require.main === module) {
  updateYouTubeChannels(50)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default updateYouTubeChannels;
