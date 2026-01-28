import { prisma } from "../../prisma";
import { fetchYoutubeChannel } from "../../../thirdparty/youtube/channel";
import { fetchPlaylistVideos } from "../../../thirdparty/youtube/playlist";
import { fetchVideoDetails } from "../../../thirdparty/youtube/video-details";

/**
 * 특정 아티스트의 Topic 채널 비디오를 모두 가져와서 DB에 저장하는 함수
 *
 * - Artist의 YoutubeChannel 중 type=TOPIC인 채널 조회
 * - YouTube API로 채널의 모든 비디오 정보 수집
 * - YoutubeVideo 테이블에 upsert
 * - YoutubeChannelVideo 매핑 생성
 */

export interface FetchTopicVideosForArtistOptions {
  dryRun?: boolean;
}

interface VideoInfo {
  videoId: string;
  ownerChannelId?: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  thumbnailStandard?: string;
  thumbnailMaxres?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSeconds?: number;
  definition?: string;
  caption?: boolean;
}

// 단일 채널 처리
async function processChannel(
  youtubeChannel: {
    id: number;
    channelId: string;
    title: string | null;
  },
  dryRun: boolean,
): Promise<{ videos: number; linked: number }> {
  console.log(`  📌 채널: ${youtubeChannel.title}`);
  console.log(`     채널 ID: ${youtubeChannel.channelId}`);

  // 1. YouTube API로 채널 정보 가져오기
  const channelResponse = await fetchYoutubeChannel({
    channelId: youtubeChannel.channelId,
  });
  const channel = channelResponse.items[0];

  if (!channel) {
    throw new Error(`Channel not found: ${youtubeChannel.channelId}`);
  }

  const uploadsPlaylistId = (channel.contentDetails as any)?.relatedPlaylists
    ?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error(
      `Uploads playlist not found for channel: ${youtubeChannel.channelId}`,
    );
  }

  const videoCount = (channel.statistics as any)?.videoCount
    ? parseInt((channel.statistics as any).videoCount, 10)
    : 0;
  const VIDEO_LIMIT = 1000;
  const isLargeChannel = videoCount > VIDEO_LIMIT;

  console.log(
    `     비디오 수 (API): ${videoCount ? videoCount.toLocaleString() : "알 수 없음"}${isLargeChannel ? ` (→ ${VIDEO_LIMIT}개 제한)` : ""}`,
  );

  // 2. 비디오 가져오기 (1000개 초과 시 제한)
  console.log(`     → 비디오 목록 가져오는 중...`);
  const playlistVideos = await fetchPlaylistVideos(
    uploadsPlaylistId,
    isLargeChannel ? { maxVideos: VIDEO_LIMIT } : {},
  );

  if (playlistVideos.length === 0) {
    console.log(`     ⚠️ 비디오 없음`);
    return { videos: 0, linked: 0 };
  }

  console.log(`     → ${playlistVideos.length}개 비디오 발견`);

  // 3. 세부 정보 가져오기
  console.log(`     → 세부 정보 가져오는 중...`);
  const videoIds = playlistVideos.map((v) => v.videoId);
  const details = await fetchVideoDetails(videoIds);

  // VideoInfo로 변환 + 세부 정보 병합
  const videos: VideoInfo[] = playlistVideos.map((v) => {
    const detail = details.get(v.videoId);
    return {
      ...v,
      viewCount: detail?.viewCount,
      likeCount: detail?.likeCount,
      commentCount: detail?.commentCount,
      durationSeconds: detail?.durationSeconds,
      definition: detail?.definition,
      caption: detail?.caption,
    };
  });

  // 4. DB 저장
  if (dryRun) {
    console.log(`     🔍 [DRY-RUN] ${videos.length}개 비디오 발견 (저장 안함)`);
    return { videos: videos.length, linked: 0 };
  }

  let linked = 0;

  for (const video of videos) {
    // YoutubeVideo upsert
    await prisma.youtubeVideo.upsert({
      where: { videoId: video.videoId },
      create: {
        videoId: video.videoId,
        ownerChannelId: video.ownerChannelId,
        title: video.title,
        description: video.description,
        publishedAt: video.publishedAt
          ? new Date(video.publishedAt)
          : undefined,
        thumbnailDefault: video.thumbnailDefault,
        thumbnailMedium: video.thumbnailMedium,
        thumbnailHigh: video.thumbnailHigh,
        thumbnailStandard: video.thumbnailStandard,
        thumbnailMaxres: video.thumbnailMaxres,
        viewCount: video.viewCount ? BigInt(video.viewCount) : undefined,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        durationSeconds: video.durationSeconds,
        definition: video.definition,
        caption: video.caption,
        fetchedAt: new Date(),
      },
      update: {
        ownerChannelId: video.ownerChannelId,
        title: video.title,
        description: video.description,
        publishedAt: video.publishedAt
          ? new Date(video.publishedAt)
          : undefined,
        thumbnailDefault: video.thumbnailDefault,
        thumbnailMedium: video.thumbnailMedium,
        thumbnailHigh: video.thumbnailHigh,
        thumbnailStandard: video.thumbnailStandard,
        thumbnailMaxres: video.thumbnailMaxres,
        viewCount: video.viewCount ? BigInt(video.viewCount) : undefined,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        durationSeconds: video.durationSeconds,
        definition: video.definition,
        caption: video.caption,
        fetchedAt: new Date(),
      },
    });

    // YoutubeChannelVideo 연결 (없으면 생성)
    const existingLink = await prisma.youtubeChannelVideo.findUnique({
      where: {
        youtubeChannelId_youtubeVideoId: {
          youtubeChannelId: youtubeChannel.id,
          youtubeVideoId: video.videoId,
        },
      },
    });

    if (!existingLink) {
      await prisma.youtubeChannelVideo.create({
        data: {
          youtubeChannelId: youtubeChannel.id,
          youtubeVideoId: video.videoId,
        },
      });
      linked++;
    }
  }

  console.log(`     ✅ ${videos.length}개 비디오 처리, 새 연결: ${linked}개`);
  return { videos: videos.length, linked };
}

export async function fetchTopicVideosForArtist(
  artistId: number,
  options: FetchTopicVideosForArtistOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  // 1. 아티스트 정보 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  console.log(
    `\n[Artist #${artist.id}] ${artist.name} (${artist.nameKo ?? ""})`,
  );
  if (dryRun) console.log(`  🔍 DRY-RUN MODE`);

  // 2. Topic 채널 조회
  const topicChannels = await prisma.youtubeChannel.findMany({
    where: {
      artistId: artist.id,
      type: "TOPIC",
    },
    select: {
      id: true,
      channelId: true,
      title: true,
    },
  });

  if (topicChannels.length === 0) {
    console.log(`  → Topic 채널이 없습니다.`);
    return;
  }

  console.log(`  → ${topicChannels.length}개 Topic 채널 발견\n`);

  // 3. 각 채널 처리
  let totalVideos = 0;
  let totalLinked = 0;
  let errors = 0;

  for (let i = 0; i < topicChannels.length; i++) {
    const channel = topicChannels[i];
    console.log(`  [${i + 1}/${topicChannels.length}]`);

    try {
      const result = await processChannel(channel, dryRun);
      totalVideos += result.videos;
      totalLinked += result.linked;

      // API 쿼터 보호를 위한 딜레이
      if (i < topicChannels.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.log(`     ❌ 오류: ${error.message}`);
      errors++;

      // 쿼터 초과 시 중단
      if (error.message?.includes("quota") || error.message?.includes("403")) {
        console.log(`\n  ❌ YouTube API 쿼터 초과. 중단합니다.`);
        break;
      }
    }
  }

  if (dryRun) {
    console.log(
      `\n  • DRY-RUN: 총 ${totalVideos}개 비디오 발견 (작업 미적용)`,
    );
    return;
  }

  console.log(
    `\n  • 완료: 총 ${totalVideos}개 비디오, 새 연결 ${totalLinked}개`,
  );
  if (errors > 0) {
    console.log(`  ⚠️ 오류: ${errors}건`);
  }
}
