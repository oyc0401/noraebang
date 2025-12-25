import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { YoutubeService } from '../../youtube/youtube.service';

// pnpm ts-node src/scripts/youtube/check-topic-playlists.ts

async function checkTopicChannelPlaylists() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const youtubeService = app.get(YoutubeService);

  try {
    console.log('🎵 Checking Topic channel playlist...\n');

    // Topic 채널 모두 조회
    const artists = await prisma.artist.findMany({
      where: {
        youtubeChannel: {
          title: { contains: ' - Topic' },
        },
      },
      include: {
        youtubeChannel: true,
      },
    });

    if (artists.length === 0) {
      console.log('✅ No Topic channels found!');
      return;
    }

    // 랜덤으로 하나 선택
    const randomIndex = Math.floor(Math.random() * artists.length);
    const artist = artists[randomIndex];

    console.log(`🎲 Selected random Topic channel (${randomIndex + 1}/${artists.length})\n`);

    console.log(`📌 ${artist.name} (${artist.nameKo})`);
    console.log(`   Channel: ${artist.youtubeChannel?.title}`);
    console.log(`   Channel ID: ${artist.youtubeChannel?.channelId}`);
    console.log(`   Subscribers: ${artist.youtubeChannel?.subscriberCount?.toLocaleString() || 'Hidden'}\n`);

    if (!artist.youtubeChannel?.channelId) {
      console.log(`   ⚠️  No channel ID`);
      return;
    }

    try {
      // 채널의 모든 재생목록 가져오기 (앨범 및 싱글)
      console.log(`📂 Fetching all playlists (albums & singles)...\n`);
      const playlists = await youtubeService.getPlaylistsFromChannel(
        artist.youtubeChannel.channelId,
        50 // 최대 50개 재생목록
      );

      if (playlists.length === 0) {
        console.log(`⚠️  No playlists found`);
        return;
      }

      console.log(`Found ${playlists.length} playlists:\n`);
      console.log('='.repeat(80) + '\n');

      // 모든 재생목록 출력
      for (let i = 0; i < playlists.length; i++) {
        const playlist = playlists[i];
        console.log(`${i + 1}. 📋 ${playlist.title}`);
        console.log(`   ID: ${playlist.playlistId}`);
        console.log(`   Videos: ${playlist.itemCount}`);
        console.log(`   Published: ${new Date(playlist.publishedAt).toLocaleDateString()}`);

        if (playlist.description) {
          const shortDesc = playlist.description.substring(0, 100);
          console.log(`   Description: ${shortDesc}${playlist.description.length > 100 ? '...' : ''}`);
        }

        console.log('');
      }

    } catch (error: any) {
      // 403 에러 (쿼터 초과)가 발생하면 중단
      if (error.message?.includes('403') || error.message?.includes('quota')) {
        console.error('\n❌ YouTube API quota exceeded. Please try again tomorrow.');
        return;
      }
      console.error(`❌ Error: ${error.message}`);
    }

    console.log('✅ Done!');

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// 스크립트 실행
if (require.main === module) {
  checkTopicChannelPlaylists()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default checkTopicChannelPlaylists;
