import { getYoutubeKeyManager } from "./keys/index";

/**
 * YouTube Playlist의 모든 비디오 목록을 가져오는 함수
 * playlistItems API 사용
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface PlaylistVideoItem {
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

export interface FetchPlaylistVideosOptions {
  maxVideos?: number;
  /**
   * 페이지(최대 50개)마다 호출된다. true를 반환하면 다음 페이지를 가져오지 않는다.
   * 업로드 재생목록은 최신순이므로 증분 수집 시 이미 저장된 페이지에서 중단해 쿼터를 아낀다.
   */
  shouldStop?: (pageItems: PlaylistVideoItem[]) => Promise<boolean> | boolean;
}

export async function fetchPlaylistVideos(
  playlistId: string,
  options: FetchPlaylistVideosOptions = {},
): Promise<PlaylistVideoItem[]> {
  const { maxVideos, shouldStop } = options;
  const keyManager = getYoutubeKeyManager();
  const videos: PlaylistVideoItem[] = [];
  let pageToken: string | undefined;

  do {
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
    const pageItems: PlaylistVideoItem[] = [];

    for (const item of items) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;

      if (!videoId) continue;

      pageItems.push({
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

    videos.push(...pageItems);
    pageToken = result.nextPageToken;

    if (shouldStop && (await shouldStop(pageItems))) {
      break;
    }

    // maxVideos 도달 시 중단
    if (maxVideos && videos.length >= maxVideos) {
      break;
    }

    // Rate limit 방지
    if (pageToken) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (pageToken);

  return videos;
}
