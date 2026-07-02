import { Injectable } from "@nestjs/common";
import type {
  MediaListQueryDto,
  MediaListSortBy,
} from "./dto/media-list-query.dto";
import type { SpotifyArtistListResponseDto } from "./dto/spotify-artist-list-response.dto";
import type { YoutubeChannelListResponseDto } from "./dto/youtube-channel-list-response.dto";
import { withMediaDb } from "./media-db";
import {
  type SpotifyArtistUpdateResult,
  updateSpotifyArtist,
} from "./spotify-update";
import {
  refreshYoutubeVideoStats,
  updateYoutubeChannel,
  type YoutubeChannelUpdateResult,
  type YoutubeVideoStatsRefreshResult,
} from "./youtube-update";

type YoutubeChannelRow = {
  id: string;
  title: string | null;
  custom_url: string | null;
  thumbnail_default: string | null;
  subscriber_count: string | null;
  video_count: string | null;
  stored_video_count: number;
  fetched_at: Date | null;
};

type SpotifyArtistRow = {
  id: string;
  name: string;
  image: string | null;
  followers: string | null;
  popularity: number | null;
  stored_track_count: number;
  fetched_at: Date | null;
};

type CountRow = {
  total: string;
};

@Injectable()
export class MediaService {
  async findYoutubeChannels(
    query: MediaListQueryDto,
  ): Promise<YoutubeChannelListResponseDto> {
    const { search, limit, offset, sortBy } = parseListQuery(query);
    const orderSql = buildYoutubeOrderSql(sortBy);

    return withMediaDb(async (client) => {
      const rows = await client.query<YoutubeChannelRow>(
        `
          select
            c.id, c.title, c.custom_url, c.thumbnail_default,
            c.subscriber_count::text as subscriber_count,
            c.video_count::text as video_count,
            c.fetched_at,
            (
              select count(*)::int
              from youtube_video v
              where v.channel_id = c.id
            ) as stored_video_count
          from youtube_channel c
          where (
            $1::text is null
            or c.title ilike '%' || $1 || '%'
            or c.custom_url ilike '%' || $1 || '%'
            or c.id = $1
          )
          ${orderSql}
          limit $2 offset $3
        `,
        [search, limit, offset],
      );
      const countRows = await client.query<CountRow>(
        `
          select count(*)::text as total
          from youtube_channel c
          where (
            $1::text is null
            or c.title ilike '%' || $1 || '%'
            or c.custom_url ilike '%' || $1 || '%'
            or c.id = $1
          )
        `,
        [search],
      );
      const total = Number(countRows.rows[0]?.total ?? 0);
      const nextOffset = offset + rows.rows.length;

      return {
        data: rows.rows.map((row) => ({
          id: row.id,
          title: row.title ?? undefined,
          customUrl: row.custom_url ?? undefined,
          thumbnail: row.thumbnail_default ?? undefined,
          subscriberCount: row.subscriber_count ?? undefined,
          videoCount: row.video_count ?? undefined,
          storedVideoCount: row.stored_video_count,
          fetchedAt: row.fetched_at?.toISOString(),
        })),
        nextOffset,
        hasMore: nextOffset < total,
        total,
      };
    });
  }

  async findSpotifyArtists(
    query: MediaListQueryDto,
  ): Promise<SpotifyArtistListResponseDto> {
    const { search, limit, offset, sortBy } = parseListQuery(query);
    const orderSql = buildSpotifyOrderSql(sortBy);

    return withMediaDb(async (client) => {
      const rows = await client.query<SpotifyArtistRow>(
        `
          select
            a.id, a.name, a.images[1] as image,
            a.followers::text as followers,
            a.popularity,
            a.fetched_at,
            (
              select count(*)::int
              from spotify_artist_track t
              where t.spotify_artist_id = a.id
            ) as stored_track_count
          from spotify_artist a
          where (
            $1::text is null
            or a.name ilike '%' || $1 || '%'
            or a.id = $1
          )
          ${orderSql}
          limit $2 offset $3
        `,
        [search, limit, offset],
      );
      const countRows = await client.query<CountRow>(
        `
          select count(*)::text as total
          from spotify_artist a
          where (
            $1::text is null
            or a.name ilike '%' || $1 || '%'
            or a.id = $1
          )
        `,
        [search],
      );
      const total = Number(countRows.rows[0]?.total ?? 0);
      const nextOffset = offset + rows.rows.length;

      return {
        data: rows.rows.map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image ?? undefined,
          followers: row.followers ?? undefined,
          popularity: row.popularity ?? undefined,
          storedTrackCount: row.stored_track_count,
          fetchedAt: row.fetched_at?.toISOString(),
        })),
        nextOffset,
        hasMore: nextOffset < total,
        total,
      };
    });
  }

  updateYoutubeChannel(channelId: string): Promise<YoutubeChannelUpdateResult> {
    return updateYoutubeChannel(channelId);
  }

  refreshYoutubeVideoStats(
    channelId: string,
  ): Promise<YoutubeVideoStatsRefreshResult> {
    return refreshYoutubeVideoStats(channelId);
  }

  updateSpotifyArtist(artistId: string): Promise<SpotifyArtistUpdateResult> {
    return updateSpotifyArtist(artistId);
  }
}

function parseListQuery(query: MediaListQueryDto): {
  search: string | null;
  limit: number;
  offset: number;
  sortBy: MediaListSortBy;
} {
  const trimmedSearch = query.search?.trim();

  return {
    search: trimmedSearch ? trimmedSearch : null,
    limit: parseBoundedInteger(query.limit, 50, 1, 100),
    offset: parseBoundedInteger(query.offset, 0, 0, 1_000_000),
    sortBy: parseSortBy(query.sortBy),
  };
}

// order by는 파라미터 바인딩이 불가능하므로 화이트리스트 문자열만 사용한다.
function buildYoutubeOrderSql(sortBy: MediaListSortBy): string {
  if (sortBy === "fetchedAt") {
    return "order by c.fetched_at asc nulls first, c.subscriber_count desc nulls last";
  }

  if (sortBy === "name") {
    return "order by lower(c.title) asc nulls last";
  }

  return "order by c.subscriber_count desc nulls last";
}

function buildSpotifyOrderSql(sortBy: MediaListSortBy): string {
  if (sortBy === "fetchedAt") {
    return "order by a.fetched_at asc nulls first, a.followers desc nulls last";
  }

  if (sortBy === "name") {
    return "order by lower(a.name) asc";
  }

  return "order by a.followers desc nulls last";
}

function parseSortBy(value: string | undefined): MediaListSortBy {
  if (value === "fetchedAt" || value === "name" || value === "popular") {
    return value;
  }

  return "popular";
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}
