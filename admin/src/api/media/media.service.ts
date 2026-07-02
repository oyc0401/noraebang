import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
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
  constructor(private readonly prisma: PrismaService) {}

  async findYoutubeChannels(
    query: MediaListQueryDto,
  ): Promise<YoutubeChannelListResponseDto> {
    const { search, limit, offset, sortBy, jpopOnly } = parseListQuery(query);
    const orderSql = buildYoutubeOrderSql(sortBy);
    const artistsByChannel = await this.findArtistsByChannel();
    const jpopChannelIds = jpopOnly ? [...artistsByChannel.keys()] : null;

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
          and ($4::text[] is null or c.id = any($4))
          ${orderSql}
          limit $2 offset $3
        `,
        [search, limit, offset, jpopChannelIds],
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
          and ($2::text[] is null or c.id = any($2))
        `,
        [search, jpopChannelIds],
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
          artists: artistsByChannel.get(row.id) ?? [],
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
    const { search, limit, offset, sortBy, jpopOnly } = parseListQuery(query);
    const orderSql = buildSpotifyOrderSql(sortBy);
    const artistsBySpotifyId = await this.findArtistsBySpotifyId();
    const jpopSpotifyIds = jpopOnly ? [...artistsBySpotifyId.keys()] : null;

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
          and ($4::text[] is null or a.id = any($4))
          ${orderSql}
          limit $2 offset $3
        `,
        [search, limit, offset, jpopSpotifyIds],
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
          and ($2::text[] is null or a.id = any($2))
        `,
        [search, jpopSpotifyIds],
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
          artists: artistsBySpotifyId.get(row.id) ?? [],
        })),
        nextOffset,
        hasMore: nextOffset < total,
        total,
      };
    });
  }

  // jpop DB Artist의 채널 연결 맵 (일반 채널 + 토픽 채널 모두 해당 아티스트로 매핑)
  private async findArtistsByChannel(): Promise<
    Map<string, { id: number; name: string }[]>
  > {
    const artists = await this.prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        youtube_channel: true,
        youtube_topic_channel: true,
      },
      where: {
        OR: [
          { youtube_channel: { not: null } },
          { youtube_topic_channel: { not: null } },
        ],
      },
    });
    const artistsByChannel = new Map<string, { id: number; name: string }[]>();

    for (const artist of artists) {
      for (const channelId of new Set(
        [artist.youtube_channel, artist.youtube_topic_channel].filter(
          (id): id is string => Boolean(id),
        ),
      )) {
        const entry = artistsByChannel.get(channelId) ?? [];
        entry.push({ id: artist.id, name: artist.name });
        artistsByChannel.set(channelId, entry);
      }
    }

    return artistsByChannel;
  }

  // jpop DB Artist의 스포티파이 연결 맵
  private async findArtistsBySpotifyId(): Promise<
    Map<string, { id: number; name: string }[]>
  > {
    const artists = await this.prisma.artist.findMany({
      select: { id: true, name: true, spotifyId: true },
      where: { spotifyId: { not: null } },
    });
    const artistsBySpotifyId = new Map<
      string,
      { id: number; name: string }[]
    >();

    for (const artist of artists) {
      if (!artist.spotifyId) continue;

      const entry = artistsBySpotifyId.get(artist.spotifyId) ?? [];
      entry.push({ id: artist.id, name: artist.name });
      artistsBySpotifyId.set(artist.spotifyId, entry);
    }

    return artistsBySpotifyId;
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
  jpopOnly: boolean;
} {
  const trimmedSearch = query.search?.trim();

  return {
    search: trimmedSearch ? trimmedSearch : null,
    // jpop 필터는 전체 선택 업데이트를 위해 한 페이지로 다 받을 수 있게 상한을 넉넉히 둔다.
    limit: parseBoundedInteger(query.limit, 50, 1, 2_000),
    offset: parseBoundedInteger(query.offset, 0, 0, 1_000_000),
    sortBy: parseSortBy(query.sortBy),
    jpopOnly: query.jpopOnly === "true",
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
