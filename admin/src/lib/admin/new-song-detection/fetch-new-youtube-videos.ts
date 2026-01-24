import { prisma } from "../../prisma";
import { fetchYoutubeChannel } from "../../../thirdparty/youtube/channel";
import { fetchVideoDetails } from "../../../thirdparty/youtube/video-details";
import { getYoutubeKeyManager } from "../../../thirdparty/youtube/keys/index";

/**
 * 특정 아티스트의 Topic 채널에서 새로 추가된 비디오만 감지하여 DB에 저장하는 함수
 *
 * - 기존 비디오는 업데이트하지 않음 (새 비디오만 추가)
 * - uploadsPlaylistId를 캐시하여 채널 API 호출 최소화
 * - playlistItems를 최신순으로 조회하다가 DB에 있는 비디오를 만나면 중단
 * - 쿼터 효율: 새 비디오 0개 → 1 unit, 새 비디오 1~50개 → 2 units
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface FetchNewTopicVideosOptions {
  dryRun?: boolean;
}

interface PlaylistVideoItem {
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
}

// uploads 플레이리스트 ID 가져오기 (캐시 또는 API 호출)
async function getUploadsPlaylistId(channel: {
  id: number;
  channelId: string;
  uploadsPlaylistId: string | null;
}): Promise<string> {
  // 이미 캐시되어 있으면 반환
  if (channel.uploadsPlaylistId) {
    return channel.uploadsPlaylistId;
  }

  // API로 가져오기
  console.log(`     → uploads 플레이리스트 ID 조회 중...`);
  const channelResponse = await fetchYoutubeChannel({
    channelId: channel.channelId,
  });
  const channelData = channelResponse.items[0];

  if (!channelData) {
    throw new Error(`Channel not found: ${channel.channelId}`);
  }

  const uploadsPlaylistId = (channelData.contentDetails as any)
    ?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error(
      `Uploads playlist not found for channel: ${channel.channelId}`,
    );
  }

  // DB에 캐시
  await prisma.youtubeChannel.update({
    where: { id: channel.id },
    data: { uploadsPlaylistId },
  });

  console.log(`     → 캐시 완료: ${uploadsPlaylistId}`);
  return uploadsPlaylistId;
}

// 새 비디오만 가져오기 (기존 비디오 만나면 중단)
async function fetchNewVideosFromPlaylist(
  playlistId: string,
  existingVideoIds: Set<string>,
): Promise<PlaylistVideoItem[]> {
  const keyManager = getYoutubeKeyManager();
  const newVideos: PlaylistVideoItem[] = [];
  let pageToken: string | undefined;
  let shouldContinue = true;

  while (shouldContinue) {
    const result = await keyManager.reuseWithRetry(async (apiKey) => {
      const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("playlistId", playlistId);
      url.searchParams.set("maxResults", "50");

      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error?.message ||
            `YouTube playlistItems request failed (status ${response.status})`,
        );
      }

      return await response.json();
    });

    const items = Array.isArray(result.items) ? result.items : [];

    for (const item of items) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;

      if (!videoId) continue;

      // 기존 비디오를 만나면 중단
      if (existingVideoIds.has(videoId)) {
        shouldContinue = false;
        break;
      }

      newVideos.push({
        videoId,
        ownerChannelId: snippet.videoOwnerChannelId,
        title: snippet.title,
        description: snippet.description,
        publishedAt: snippet.publishedAt,
        thumbnailDefault: snippet.thumbnails?.default?.url,
        thumbnailMedium: snippet.thumbnails?.medium?.url,
        thumbnailHigh: snippet.thumbnails?.high?.url,
        thumbnailStandard: snippet.thumbnails?.standard?.url,
        thumbnailMaxres: snippet.thumbnails?.maxres?.url,
      });
    }

    pageToken = result.nextPageToken;

    // 다음 페이지가 없거나 기존 비디오를 만났으면 종료
    if (!pageToken || !shouldContinue) {
      break;
    }

    // Rate limit 방지
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return newVideos;
}

// 단일 채널 처리
async function processChannel(
  youtubeChannel: {
    id: number;
    channelId: string;
    title: string | null;
    uploadsPlaylistId: string | null;
  },
  dryRun: boolean,
): Promise<{ newVideos: number; linked: number }> {
  console.log(`  📌 채널: ${youtubeChannel.title}`);
  console.log(`     채널 ID: ${youtubeChannel.channelId}`);

  // 1. uploads 플레이리스트 ID 가져오기
  const uploadsPlaylistId = await getUploadsPlaylistId(youtubeChannel);

  // 2. 이 채널에 연결된 기존 비디오 ID 조회
  const existingLinks = await prisma.youtubeChannelVideo.findMany({
    where: { youtubeChannelId: youtubeChannel.id },
    select: { youtubeVideoId: true },
  });
  const existingVideoIds = new Set(existingLinks.map((l) => l.youtubeVideoId));
  console.log(`     기존 비디오: ${existingVideoIds.size}개`);

  // 3. 새 비디오만 가져오기
  console.log(`     → 새 비디오 확인 중...`);
  const newVideos = await fetchNewVideosFromPlaylist(
    uploadsPlaylistId,
    existingVideoIds,
  );

  if (newVideos.length === 0) {
    console.log(`     ✅ 새 비디오 없음`);
    return { newVideos: 0, linked: 0 };
  }

  console.log(`     → ${newVideos.length}개 새 비디오 발견`);

  if (dryRun) {
    console.log(`     🔍 [DRY-RUN] 저장하지 않음`);
    return { newVideos: newVideos.length, linked: 0 };
  }

  // 4. 세부 정보 가져오기
  console.log(`     → 세부 정보 가져오는 중...`);
  const videoIds = newVideos.map((v) => v.videoId);
  const details = await fetchVideoDetails(videoIds);

  // 5. DB 저장
  let linked = 0;

  for (const video of newVideos) {
    const detail = details.get(video.videoId);

    // YoutubeVideo 생성 (이미 존재하면 skip)
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
        viewCount: detail?.viewCount ? BigInt(detail.viewCount) : undefined,
        likeCount: detail?.likeCount,
        commentCount: detail?.commentCount,
        durationSeconds: detail?.durationSeconds,
        definition: detail?.definition,
        caption: detail?.caption,
        fetchedAt: new Date(),
      },
      update: {}, // 기존 비디오는 업데이트하지 않음
    });

    // YoutubeChannelVideo 연결
    await prisma.youtubeChannelVideo.create({
      data: {
        youtubeChannelId: youtubeChannel.id,
        youtubeVideoId: video.videoId,
      },
    });
    linked++;
  }

  console.log(`     ✅ ${newVideos.length}개 비디오 추가, 연결: ${linked}개`);
  return { newVideos: newVideos.length, linked };
}

export async function fetchNewTopicVideos(
  artistId: number,
  options: FetchNewTopicVideosOptions = {},
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
      uploadsPlaylistId: true,
    },
  });

  if (topicChannels.length === 0) {
    console.log(`  → Topic 채널이 없습니다.`);
    return;
  }

  console.log(`  → ${topicChannels.length}개 Topic 채널 발견\n`);

  // 3. 각 채널 처리
  let totalNewVideos = 0;
  let totalLinked = 0;
  let errors = 0;

  for (let i = 0; i < topicChannels.length; i++) {
    const channel = topicChannels[i];
    console.log(`  [${i + 1}/${topicChannels.length}]`);

    try {
      const result = await processChannel(channel, dryRun);
      totalNewVideos += result.newVideos;
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
      `\n  • DRY-RUN: 총 ${totalNewVideos}개 새 비디오 발견 (작업 미적용)`,
    );
    return;
  }

  console.log(
    `\n  • 완료: 총 ${totalNewVideos}개 새 비디오, 연결 ${totalLinked}개`,
  );
  if (errors > 0) {
    console.log(`  ⚠️ 오류: ${errors}건`);
  }
}
