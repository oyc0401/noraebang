/**
 * 아티스트 Topic 채널의 모든 비디오(곡) 정보 가져오기
 *
 * artistId <= 300인 아티스트 중 Topic 채널(title이 "- Topic"으로 끝남)이 있는 경우
 * 해당 채널의 모든 비디오 정보를 가져와 DB에 저장합니다.
 *
 * 사용법:
 * pnpm ts-node src/scripts/youtube/fetch-channel-videos.ts
 * pnpm ts-node src/scripts/youtube/fetch-channel-videos.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { getYoutubeKeyManager } from "../../thirdparty/youtube/keys";

// pnpm ts-node src/scripts/youtube/fetch-channel-videos.ts
// pnpm ts-node src/scripts/youtube/fetch-channel-videos.ts --dry-run
// pnpm ts-node src/scripts/youtube/fetch-channel-videos.ts 23        (23번째부터 시작)
// pnpm ts-node src/scripts/youtube/fetch-channel-videos.ts 23 --dry-run

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes("--dry-run");
const START_INDEX = parseInt(
  process.argv.find((arg) => /^\d+$/.test(arg)) || "0",
  10,
);

const keyManager = getYoutubeKeyManager();

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

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
  // videos API에서 가져오는 세부 정보
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSeconds?: number;
  definition?: string;
  caption?: boolean;
}

interface ChannelInfo {
  channelId: string;
  title: string;
  uploadsPlaylistId: string;
  subscriberCount?: number;
  videoCount?: number;
}

async function youtubeFetch(path: string, params: Record<string, string>) {
  return keyManager.reuseWithRetry(async (apiKey) => {
    const query = new URLSearchParams({
      ...params,
      key: apiKey,
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/${path}?${query.toString()}`,
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || `YouTube API error (${response.status})`,
      );
    }

    return data;
  });
}

async function getChannelInfo(channelId: string): Promise<ChannelInfo> {
  const params: Record<string, string> = {
    part: "snippet,statistics,contentDetails",
  };

  // @로 시작하면 handle로 검색
  if (channelId.startsWith("@")) {
    params.forHandle = channelId.slice(1);
  } else {
    params.id = channelId;
  }

  const data = await youtubeFetch("channels", params);
  const channel = Array.isArray(data.items) ? data.items[0] : null;

  if (!channel) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error(`Uploads playlist not found for channel: ${channelId}`);
  }

  return {
    channelId: channel.id,
    title: channel.snippet?.title ?? "Unknown Channel",
    uploadsPlaylistId,
    subscriberCount: channel.statistics?.subscriberCount
      ? parseInt(channel.statistics.subscriberCount, 10)
      : undefined,
    videoCount: channel.statistics?.videoCount
      ? parseInt(channel.statistics.videoCount, 10)
      : undefined,
  };
}

// ISO 8601 duration을 초로 변환 (예: PT4M13S -> 253)
function parseDuration(duration?: string): number | undefined {
  if (!duration) return undefined;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

interface VideoDetails {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSeconds?: number;
  definition?: string;
  caption?: boolean;
}

// videos API로 세부 정보 가져오기 (50개씩 배치)
async function getVideoDetails(
  videoIds: string[],
): Promise<Map<string, VideoDetails>> {
  const result = new Map<string, VideoDetails>();

  // 50개씩 배치 처리
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    const data = await youtubeFetch("videos", {
      part: "statistics,contentDetails",
      id: batch.join(","),
    });

    const items = Array.isArray(data.items) ? data.items : [];

    for (const item of items) {
      const stats = item.statistics;
      const content = item.contentDetails;

      result.set(item.id, {
        viewCount: stats?.viewCount ? parseInt(stats.viewCount, 10) : undefined,
        likeCount: stats?.likeCount ? parseInt(stats.likeCount, 10) : undefined,
        commentCount: stats?.commentCount
          ? parseInt(stats.commentCount, 10)
          : undefined,
        durationSeconds: parseDuration(content?.duration),
        definition: content?.definition,
        caption: content?.caption === "true",
      });
    }

    // 진행 상황 출력
    process.stdout.write(
      `\r   세부정보 가져오기: ${Math.min(i + 50, videoIds.length)}/${videoIds.length}개`,
    );

    // Rate limit 방지
    if (i + 50 < videoIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log("\n");
  return result;
}

async function getAllVideosFromPlaylist(
  playlistId: string,
): Promise<VideoInfo[]> {
  const videos: VideoInfo[] = [];
  let pageToken: string | undefined;

  console.log("📥 비디오 목록 가져오는 중...\n");

  do {
    const params: Record<string, string> = {
      part: "snippet",
      playlistId,
      maxResults: "50", // API 최대값
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const data = await youtubeFetch("playlistItems", params);
    const items = Array.isArray(data.items) ? data.items : [];

    for (const item of items) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;

      if (!videoId) continue;

      videos.push({
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

    pageToken = data.nextPageToken;

    // 진행 상황 출력
    process.stdout.write(`\r   가져온 비디오: ${videos.length}개`);

    // Rate limit 방지
    if (pageToken) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (pageToken);

  console.log("\n");

  return videos;
}

// 단일 채널 처리
async function processChannel(youtubeChannel: {
  id: number;
  channelId: string;
  title: string | null;
  artist: { id: number; name: string; nameKo: string };
}): Promise<{ videos: number; linked: number }> {
  console.log(`\n📌 채널: ${youtubeChannel.title}`);
  console.log(
    `   아티스트: ${youtubeChannel.artist.name} (${youtubeChannel.artist.nameKo})`,
  );
  console.log(`   채널 ID: ${youtubeChannel.channelId}`);

  // 1. YouTube API로 채널 정보 가져오기
  const channelInfo = await getChannelInfo(youtubeChannel.channelId);
  console.log(
    `   비디오 수 (API): ${channelInfo.videoCount?.toLocaleString() ?? "알 수 없음"}`,
  );

  // 2. 모든 비디오 가져오기
  const videos = await getAllVideosFromPlaylist(channelInfo.uploadsPlaylistId);

  if (videos.length === 0) {
    console.log(`   ⚠️ 비디오 없음`);
    return { videos: 0, linked: 0 };
  }

  // 3. 세부 정보 가져오기
  console.log("   📊 세부 정보 가져오는 중...");
  const videoIds = videos.map((v) => v.videoId);
  const details = await getVideoDetails(videoIds);

  // 세부 정보 병합
  for (const video of videos) {
    const detail = details.get(video.videoId);
    if (detail) {
      video.viewCount = detail.viewCount;
      video.likeCount = detail.likeCount;
      video.commentCount = detail.commentCount;
      video.durationSeconds = detail.durationSeconds;
      video.definition = detail.definition;
      video.caption = detail.caption;
    }
  }

  // 4. DB 저장
  if (DRY_RUN) {
    console.log(`   🔍 [DRY-RUN] ${videos.length}개 비디오 발견 (저장 안함)`);
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

  console.log(`   ✅ ${videos.length}개 비디오 처리, 새 연결: ${linked}개`);
  return { videos: videos.length, linked };
}

async function main() {
  console.log("🎬 Topic 채널 비디오 가져오기\n");
  console.log("=".repeat(80));

  // 1. 조건에 맞는 Topic 채널 조회
  // - artistId <= 300
  // - type = TOPIC
  // - title이 "- Topic"으로 끝남
  const topicChannels = await prisma.youtubeChannel.findMany({
    where: {
      artistId: { lte: 300 },
      type: "TOPIC",
      title: { endsWith: "- Topic" },

      // ✅ DB에서 이 채널에 연결된 비디오가 "하나도 없는" 경우만
      videos: {
        none: {}, // YoutubeChannelVideo 레코드 0개
      },
    },
    include: {
      artist: {
        select: { id: true, name: true, nameKo: true },
      },
    },
    orderBy: { artistId: "asc" },
  });

  console.log(`\n📋 처리할 Topic 채널: ${topicChannels.length}개\n`);

  if (topicChannels.length === 0) {
    console.log("⚠️ 조건에 맞는 Topic 채널이 없습니다.");
    return;
  }

  if (DRY_RUN) {
    console.log("🔍 [DRY-RUN 모드]\n");
  }

  if (START_INDEX > 0) {
    console.log(`⏭️ ${START_INDEX}번째부터 시작합니다.\n`);
  }

  console.log("=".repeat(80));

  let totalVideos = 0;
  let totalLinked = 0;
  let processed = 0;
  let errors = 0;

  for (let i = START_INDEX; i < topicChannels.length; i++) {
    const channel = topicChannels[i];
    console.log(`\n[${i + 1}/${topicChannels.length}]`);

    try {
      const result = await processChannel(channel);
      totalVideos += result.videos;
      totalLinked += result.linked;
      processed++;

      // API 쿼터 보호를 위한 딜레이
      if (i < topicChannels.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`   ❌ 오류: ${error.message}`);
      errors++;

      // 쿼터 초과 시 중단
      if (error.message?.includes("quota") || error.message?.includes("403")) {
        console.error("\n❌ YouTube API 쿼터 초과. 중단합니다.");
        break;
      }
    }
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("\n📊 최종 결과:");
  console.log(`   처리된 채널: ${processed}/${topicChannels.length}개`);
  console.log(`   총 비디오: ${totalVideos}개`);
  console.log(`   새 연결: ${totalLinked}개`);
  console.log(`   오류: ${errors}개`);
  console.log(`\n${"=".repeat(80)}`);
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
