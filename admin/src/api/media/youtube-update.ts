import type { Client } from "pg";
import { fetchYoutubeChannel } from "../../youtube/channel";
import {
  fetchPlaylistVideos,
  type PlaylistVideoItem,
} from "../../youtube/playlist";
import {
  fetchYoutubeVideos,
  type YoutubeVideoDetailsResponse,
} from "../../youtube/videos";
import { withMediaDb } from "./media-db";

/**
 * 유튜브 채널 갱신 (쿼터 절약 전략)
 * - search API(100유닛) 대신 channels.list(1유닛) + playlistItems(페이지당 1유닛)만 사용
 * - 업로드 재생목록은 최신순이므로, 전부 이미 저장된 페이지가 나오면 즉시 중단 (증분 수집)
 * - 신규 영상만 videos.list(50개 배치당 1유닛)로 상세 조회
 */

const VIDEO_DETAILS_BATCH_SIZE = 50;

export type YoutubeChannelUpdateResult = {
  channelId: string;
  title?: string;
  newVideoCount: number;
  apiCallCount: number;
};

export type YoutubeVideoStatsRefreshResult = {
  channelId: string;
  videoCount: number;
  apiCallCount: number;
};

type ChannelSnippet = {
  title?: string;
  description?: string;
  customUrl?: string;
  publishedAt?: string;
  country?: string;
  defaultLanguage?: string;
  thumbnails?: {
    default?: { url?: string };
    medium?: { url?: string };
    high?: { url?: string };
  };
};

type ChannelStatistics = {
  subscriberCount?: string;
  videoCount?: string;
  viewCount?: string;
  hiddenSubscriberCount?: boolean;
};

type ChannelContentDetails = {
  relatedPlaylists?: { uploads?: string };
};

type VideoSnippet = {
  channelId?: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  thumbnails?: Partial<
    Record<
      "default" | "medium" | "high" | "standard" | "maxres",
      { url?: string }
    >
  >;
};

export async function updateYoutubeChannel(
  channelId: string,
): Promise<YoutubeChannelUpdateResult> {
  let apiCallCount = 1;
  const channelResponse = await fetchYoutubeChannel({ channelId });
  const channel = channelResponse.items?.[0];

  if (!channel) {
    throw new Error(`유튜브 채널을 찾을 수 없습니다: ${channelId}`);
  }

  const snippet = (channel.snippet ?? {}) as ChannelSnippet;
  const statistics = (channel.statistics ?? {}) as ChannelStatistics;
  const contentDetails = (channel.contentDetails ??
    {}) as ChannelContentDetails;
  const uploadsPlaylistId = contentDetails.relatedPlaylists?.uploads ?? null;

  return withMediaDb(async (client) => {
    await upsertChannel(
      client,
      channel.id,
      snippet,
      statistics,
      uploadsPlaylistId,
    );

    const newVideos: PlaylistVideoItem[] = [];

    if (uploadsPlaylistId) {
      await fetchPlaylistVideos(uploadsPlaylistId, {
        shouldStop: async (pageItems) => {
          apiCallCount += 1;
          const existingIds = await findExistingVideoIds(
            client,
            pageItems.map((item) => item.videoId),
          );
          const freshItems = pageItems.filter(
            (item) => !existingIds.has(item.videoId),
          );
          newVideos.push(...freshItems);
          return freshItems.length === 0;
        },
      });
    }

    for (const batch of chunk(newVideos, VIDEO_DETAILS_BATCH_SIZE)) {
      const details = await fetchYoutubeVideos(batch.map((v) => v.videoId));
      apiCallCount += 1;
      await insertVideos(client, details.items);
    }

    return {
      channelId: channel.id,
      title: snippet.title,
      newVideoCount: newVideos.length,
      apiCallCount,
    };
  });
}

// 저장된 전체 영상의 조회수/좋아요 통계를 갱신한다. (50개 배치당 1유닛)
export async function refreshYoutubeVideoStats(
  channelId: string,
): Promise<YoutubeVideoStatsRefreshResult> {
  return withMediaDb(async (client) => {
    const result = await client.query<{ id: string }>(
      "select id from youtube_video where channel_id = $1",
      [channelId],
    );
    const videoIds = result.rows.map((row) => row.id);
    let apiCallCount = 0;

    for (const batch of chunk(videoIds, VIDEO_DETAILS_BATCH_SIZE)) {
      const details = await fetchYoutubeVideos(batch);
      apiCallCount += 1;
      await updateVideoStats(client, details.items);
    }

    return { channelId, videoCount: videoIds.length, apiCallCount };
  });
}

async function upsertChannel(
  client: Client,
  channelId: string,
  snippet: ChannelSnippet,
  statistics: ChannelStatistics,
  uploadsPlaylistId: string | null,
): Promise<void> {
  await client.query(
    `
      insert into youtube_channel (
        id, title, description, custom_url, published_at, country,
        default_language, thumbnail_default, thumbnail_medium, thumbnail_high,
        subscriber_count, video_count, view_count, hidden_subscriber_count,
        uploads_playlist_id, fetched_at, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        now(), now()
      )
      on conflict (id) do update set
        title = excluded.title,
        description = excluded.description,
        custom_url = excluded.custom_url,
        published_at = excluded.published_at,
        country = excluded.country,
        default_language = excluded.default_language,
        thumbnail_default = excluded.thumbnail_default,
        thumbnail_medium = excluded.thumbnail_medium,
        thumbnail_high = excluded.thumbnail_high,
        subscriber_count = excluded.subscriber_count,
        video_count = excluded.video_count,
        view_count = excluded.view_count,
        hidden_subscriber_count = excluded.hidden_subscriber_count,
        uploads_playlist_id = excluded.uploads_playlist_id,
        fetched_at = now(),
        updated_at = now()
    `,
    [
      channelId,
      snippet.title ?? null,
      snippet.description ?? null,
      snippet.customUrl ?? null,
      snippet.publishedAt ?? null,
      snippet.country ?? null,
      snippet.defaultLanguage ?? null,
      snippet.thumbnails?.default?.url ?? null,
      snippet.thumbnails?.medium?.url ?? null,
      snippet.thumbnails?.high?.url ?? null,
      statistics.subscriberCount ?? null,
      statistics.videoCount ?? null,
      statistics.viewCount ?? null,
      statistics.hiddenSubscriberCount ?? null,
      uploadsPlaylistId,
    ],
  );
}

async function findExistingVideoIds(
  client: Client,
  videoIds: string[],
): Promise<Set<string>> {
  if (videoIds.length === 0) {
    return new Set();
  }

  const result = await client.query<{ id: string }>(
    "select id from youtube_video where id = any($1::text[])",
    [videoIds],
  );

  return new Set(result.rows.map((row) => row.id));
}

async function insertVideos(
  client: Client,
  items: YoutubeVideoDetailsResponse["items"],
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const rows = items.map((item) => {
    const snippet = (item.snippet ?? {}) as VideoSnippet;

    return {
      id: item.id,
      channel_id: snippet.channelId ?? null,
      title: snippet.title ?? null,
      description: snippet.description ?? null,
      published_at: snippet.publishedAt ?? null,
      thumbnail_default: snippet.thumbnails?.default?.url ?? null,
      thumbnail_medium: snippet.thumbnails?.medium?.url ?? null,
      thumbnail_high: snippet.thumbnails?.high?.url ?? null,
      thumbnail_standard: snippet.thumbnails?.standard?.url ?? null,
      thumbnail_maxres: snippet.thumbnails?.maxres?.url ?? null,
      view_count: item.statistics?.viewCount ?? null,
      like_count: item.statistics?.likeCount ?? null,
      comment_count: item.statistics?.commentCount ?? null,
      duration_seconds: parseIsoDurationToSeconds(
        item.contentDetails?.duration,
      ),
      definition: item.contentDetails?.definition ?? null,
      caption: parseCaption(item.contentDetails?.caption),
    };
  });

  await client.query(
    `
      insert into youtube_video (
        id, channel_id, title, description, published_at,
        thumbnail_default, thumbnail_medium, thumbnail_high,
        thumbnail_standard, thumbnail_maxres,
        view_count, like_count, comment_count,
        duration_seconds, definition, caption, updated_at
      )
      select
        r.id, r.channel_id, r.title, r.description, r.published_at,
        r.thumbnail_default, r.thumbnail_medium, r.thumbnail_high,
        r.thumbnail_standard, r.thumbnail_maxres,
        r.view_count, r.like_count, r.comment_count,
        r.duration_seconds, r.definition, r.caption, now()
      from jsonb_to_recordset($1::jsonb) as r(
        id text, channel_id text, title text, description text,
        published_at timestamp,
        thumbnail_default text, thumbnail_medium text, thumbnail_high text,
        thumbnail_standard text, thumbnail_maxres text,
        view_count bigint, like_count bigint, comment_count bigint,
        duration_seconds int, definition text, caption boolean
      )
      on conflict (id) do update set
        channel_id = excluded.channel_id,
        title = excluded.title,
        description = excluded.description,
        published_at = excluded.published_at,
        thumbnail_default = excluded.thumbnail_default,
        thumbnail_medium = excluded.thumbnail_medium,
        thumbnail_high = excluded.thumbnail_high,
        thumbnail_standard = excluded.thumbnail_standard,
        thumbnail_maxres = excluded.thumbnail_maxres,
        view_count = excluded.view_count,
        like_count = excluded.like_count,
        comment_count = excluded.comment_count,
        duration_seconds = excluded.duration_seconds,
        definition = excluded.definition,
        caption = excluded.caption,
        updated_at = now()
    `,
    [JSON.stringify(rows)],
  );
}

async function updateVideoStats(
  client: Client,
  items: YoutubeVideoDetailsResponse["items"],
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const rows = items.map((item) => ({
    id: item.id,
    view_count: item.statistics?.viewCount ?? null,
    like_count: item.statistics?.likeCount ?? null,
    comment_count: item.statistics?.commentCount ?? null,
  }));

  await client.query(
    `
      update youtube_video v
      set
        view_count = r.view_count,
        like_count = r.like_count,
        comment_count = r.comment_count,
        updated_at = now()
      from jsonb_to_recordset($1::jsonb) as r(
        id text, view_count bigint, like_count bigint, comment_count bigint
      )
      where v.id = r.id
    `,
    [JSON.stringify(rows)],
  );
}

function parseIsoDurationToSeconds(duration?: string): number | null {
  if (!duration) {
    return null;
  }

  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    duration,
  );

  if (!match) {
    return null;
  }

  const [, days, hours, minutes, seconds] = match;

  return (
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  );
}

function parseCaption(caption?: string): boolean | null {
  if (caption === "true") return true;
  if (caption === "false") return false;
  return null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}
