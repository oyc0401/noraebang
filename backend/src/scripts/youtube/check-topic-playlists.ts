import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../app.module";
import { PrismaService } from "../../prisma/prisma.service";
import { YoutubeService } from "../../youtube/youtube.service";

// pnpm ts-node src/scripts/youtube/check-topic-playlists.ts

async function checkTopicChannelPlaylists() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const youtubeService = app.get(YoutubeService);

  try {
    console.log("🎵 Checking Topic channels...\n");

    // Topic 채널 모두 조회 (최대 50개)
    const artists = await prisma.artist.findMany({
      where: {
        youtubeChannel: {
          title: { contains: " - Topic" },
        },
      },
      include: {
        youtubeChannel: true,
      },
      take: 50,
    });

    if (artists.length === 0) {
      console.log("✅ No Topic channels found!");
      return;
    }

    console.log(`📊 Found ${artists.length} Topic channels to check\n`);
    console.log(`${"=".repeat(80)}\n`);

    let checkedCount = 0;
    let foundOriginalCount = 0;

    for (let idx = 0; idx < artists.length; idx++) {
      const artist = artists[idx];

      console.log(
        `[${idx + 1}/${artists.length}] 📌 ${artist.name} (${artist.nameKo})`,
      );
      console.log(`   Topic Channel: ${artist.youtubeChannel?.title}`);
      console.log(
        `   Subscribers: ${artist.youtubeChannel?.subscriberCount?.toLocaleString() || "Hidden"}`,
      );

      if (!artist.youtubeChannel?.channelId) {
        console.log(`   ⚠️  No channel ID\n`);
        console.log(`${"=".repeat(80)}\n`);
        continue;
      }

      try {
        // 채널의 재생목록 가져오기 (최대 5개만)
        const playlists = await youtubeService.getPlaylistsFromChannel(
          artist.youtubeChannel.channelId,
          5,
        );

        if (playlists.length === 0) {
          console.log(`   ⚠️  No playlists found\n`);
          console.log(`${"=".repeat(80)}\n`);
          continue;
        }

        // 첫 번째 재생목록의 동영상들 가져오기
        const firstPlaylist = playlists[0];
        const videos = await youtubeService.getVideosFromPlaylist(
          firstPlaylist.playlistId,
          20,
        );

        if (videos.length === 0) {
          console.log(`   ⚠️  No videos found in playlist\n`);
          console.log(`${"=".repeat(80)}\n`);
          continue;
        }

        checkedCount++;

        // 채널별로 동영상 개수 세기 (원본 채널 찾기)
        const channelCount: {
          [channelId: string]: { title: string; count: number };
        } = {};

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

        // Topic이 아닌 가장 많은 채널 찾기
        const originalChannel = channelStats.find(
          (stat) => !stat.title.includes(" - Topic"),
        );

        if (
          originalChannel &&
          originalChannel.channelId !== artist.youtubeChannel.channelId
        ) {
          foundOriginalCount++;
          console.log(`   ✨ Found original channel: ${originalChannel.title}`);
          console.log(`   📺 Channel ID: ${originalChannel.channelId}`);
          console.log(
            `   🎬 Videos in playlist: ${originalChannel.count}/${videos.length}`,
          );

          // 채널 정보 가져오고 DB 업데이트
          try {
            const channelDetails = await youtubeService.getChannelDetails(
              originalChannel.channelId,
            );
            console.log(
              `   👥 Subscribers: ${channelDetails.subscriberCount?.toLocaleString() || "Hidden"}`,
            );
            console.log(
              `   📹 Total videos: ${channelDetails.videoCount?.toLocaleString() || "Unknown"}`,
            );
            if (channelDetails.customUrl) {
              console.log(`   🔗 URL: ${channelDetails.customUrl}`);
            }

            // DB에 원본 채널로 업데이트
            console.log(`   💾 Updating DB with original channel...`);
            await youtubeService.updateArtistChannel(
              artist.id,
              originalChannel.channelId,
            );
            console.log(`   ✅ DB updated successfully!`);
          } catch (error: any) {
            console.log(`   ⚠️  Could not update channel: ${error.message}`);
          }
        } else {
          console.log(`   ℹ️  No original channel found (all from Topic)`);
        }

        console.log("");
        console.log(`${"=".repeat(80)}\n`);
      } catch (error: any) {
        // 403 에러 (쿼터 초과)가 발생하면 중단
        if (
          error.message?.includes("403") ||
          error.message?.includes("quota")
        ) {
          console.error(
            "\n❌ YouTube API quota exceeded. Please try again tomorrow.",
          );
          console.log(
            `\n📊 Summary: Checked ${checkedCount}/${artists.length} channels, found ${foundOriginalCount} original channels\n`,
          );
          return;
        }
        console.error(`   ❌ Error: ${error.message}\n`);
        console.log(`${"=".repeat(80)}\n`);
      }
    }

    console.log("\n✅ Done!");
    console.log(
      `\n📊 Summary: Checked ${checkedCount}/${artists.length} channels, found ${foundOriginalCount} original channels\n`,
    );
  } catch (error: any) {
    console.error("❌ Fatal error:", error);
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
