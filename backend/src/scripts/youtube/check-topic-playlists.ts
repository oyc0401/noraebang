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
    console.log('🎵 Checking Topic channel videos...\n');

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
      // 채널의 재생목록 가져오기
      console.log(`📂 Fetching playlists...\n`);
      const playlists = await youtubeService.getPlaylistsFromChannel(
        artist.youtubeChannel.channelId,
        10 // 최대 10개 재생목록만
      );

      if (playlists.length === 0) {
        console.log(`⚠️  No playlists found`);
        return;
      }

      console.log(`Found ${playlists.length} playlists\n`);

      // 첫 번째 재생목록의 동영상들 가져오기
      const firstPlaylist = playlists[0];
      console.log(`📋 Checking playlist: ${firstPlaylist.title}`);
      console.log(`   ID: ${firstPlaylist.playlistId}`);
      console.log(`   Videos: ${firstPlaylist.itemCount}\n`);

      const videos = await youtubeService.getVideosFromPlaylist(
        firstPlaylist.playlistId,
        20 // 최대 20개 동영상
      );

      if (videos.length === 0) {
        console.log(`⚠️  No videos found in playlist`);
        return;
      }

      console.log(`🎬 Found ${videos.length} videos:\n`);
      console.log('='.repeat(80) + '\n');

      // 채널별로 동영상 개수 세기 (원본 채널 찾기)
      const channelCount: { [channelId: string]: { title: string; count: number } } = {};

      for (const video of videos) {
        if (!channelCount[video.channelId]) {
          channelCount[video.channelId] = {
            title: video.channelTitle,
            count: 0,
          };
        }
        channelCount[video.channelId].count++;
      }

      // 가장 많이 나타나는 채널 찾기
      const channelStats = Object.entries(channelCount)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([channelId, data]) => ({ channelId, ...data }));

      console.log(`📊 Channel statistics:\n`);
      for (const stat of channelStats) {
        const isTopic = stat.title.includes(' - Topic');
        const isCurrentChannel = stat.channelId === artist.youtubeChannel.channelId;
        const marker = isCurrentChannel ? '👉' : isTopic ? '🎵' : '✨';
        console.log(`   ${marker} ${stat.title}: ${stat.count} videos (ID: ${stat.channelId})`);
      }
      console.log('');

      // Topic이 아닌 가장 많은 채널 찾기
      const originalChannel = channelStats.find((stat) => !stat.title.includes(' - Topic'));

      if (originalChannel && originalChannel.channelId !== artist.youtubeChannel.channelId) {
        console.log(`💡 Found potential original channel:\n`);
        console.log(`   Name: ${originalChannel.title}`);
        console.log(`   Channel ID: ${originalChannel.channelId}`);
        console.log(`   Videos in playlist: ${originalChannel.count}\n`);

        // 채널 정보 가져오기
        try {
          const channelDetails = await youtubeService.getChannelDetails(originalChannel.channelId);
          console.log(`📺 Channel details:\n`);
          console.log(`   Subscribers: ${channelDetails.subscriberCount?.toLocaleString() || 'Hidden'}`);
          console.log(`   Total videos: ${channelDetails.videoCount?.toLocaleString() || 'Unknown'}`);
          console.log(`   Custom URL: ${channelDetails.customUrl || 'None'}\n`);
        } catch (error: any) {
          console.log(`   ⚠️  Could not fetch channel details: ${error.message}\n`);
        }
      } else {
        console.log(`ℹ️  No original channel found (all videos are from Topic channel)\n`);
      }

      // 동영상 목록 출력
      for (let i = 0; i < Math.min(videos.length, 10); i++) {
        const video = videos[i];
        console.log(`${i + 1}. 🎵 ${video.title}`);
        console.log(`   Channel: ${video.channelTitle}`);
        console.log(`   Video ID: ${video.videoId}`);
        console.log(`   Published: ${new Date(video.publishedAt).toLocaleDateString()}`);
        console.log('');
      }

      if (videos.length > 10) {
        console.log(`... and ${videos.length - 10} more videos\n`);
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
