"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { ArtistFilterId } from "./filter-options";
import {
  MANAGER_PAGE_SIZE,
  type ManagerArtistDetail,
  type ManagerArtistInfo,
  type ManagerArtistSongDetail,
  type ManagerArtistSongsResult,
  type ManagerArtistSummary,
  type ManagerSpotifyPanelData,
  type ManagerSpotifyTrackSummary,
  type ManagerSortKey,
  type ManagerYoutubePanelData,
  type ManagerTjPanelData,
  type ManagerTjProposeSummary,
  type SongLinkedArtist,
} from "./types";

export type ManagerQueryParams = {
  offset?: number;
  limit?: number;
  searchTerm?: string;
  sortKey?: ManagerSortKey;
  filters?: ArtistFilterId[];
};

export type ManagerArtistsResult = {
  artists: ManagerArtistSummary[];
  totalCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

export async function fetchManagerArtistsBatch(
  params: ManagerQueryParams,
): Promise<ManagerArtistsResult> {
  const offset = Math.max(params.offset ?? 0, 0);
  const limit = clampLimit(params.limit);
  const where = buildWhereClause(params);
  const orderBy = buildOrderBy(params.sortKey);

  const [{ totalCount }, artists] = await Promise.all([
    prisma.artist.count({ where }).then((count) => ({ totalCount: count })),
    prisma.artist.findMany({
      skip: offset,
      take: limit,
      where,
      orderBy,
      select: artistSelect,
    }),
  ]);

  const mapped = artists.map(mapArtistRecord);
  const hasMore = offset + mapped.length < totalCount;

  return {
    artists: mapped,
    totalCount,
    offset,
    limit,
    hasMore,
  };
}

export async function resolveArtistBatchOffset(
  artistId: number,
  params: ManagerQueryParams,
) {
  if (!artistId || Number.isNaN(artistId)) {
    return { exists: false, offset: 0 };
  }

  const limit = clampLimit(params.limit);
  const where = buildWhereClause(params);
  const sortKey = params.sortKey ?? "idAsc";

  const [target, included] = await Promise.all([
    prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        id: true,
        spotifyArtist: { select: { popularity: true } },
      },
    }),
    prisma.artist.count({
      where: mergeWhere(where, { id: artistId }),
    }),
  ]);

  if (!target || included === 0) {
    return { exists: false, offset: 0 };
  }

  const precedingWhere = buildPrecedingWhereClause(where, sortKey, target);
  const beforeCount = precedingWhere
    ? await prisma.artist.count({ where: precedingWhere })
    : 0;

  const offset = Math.floor(beforeCount / limit) * limit;
  return { exists: true, offset };
}

const artistSelect = {
  id: true,
  name: true,
  nameKo: true,
  nameLatin: true,
  nameJaKana: true,
  nameJaKanji: true,
  slug: true,
  homeCatalog: true,
  thumbnailDefault: true,
  thumbnailMedium: true,
  thumbnailHigh: true,
  spotifyArtist: { select: { popularity: true } },
  _count: { select: { artistSongs: true } },
} satisfies Prisma.ArtistSelect;

function mapArtistRecord(
  artist: Prisma.ArtistGetPayload<{ select: typeof artistSelect }>,
): ManagerArtistSummary {
  return {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameLatin: artist.nameLatin,
    nameJa: artist.nameJaKanji ?? artist.nameJaKana,
    nameJaKana: artist.nameJaKana,
    nameJaKanji: artist.nameJaKanji,
    catalog: artist.homeCatalog,
    slug: artist.slug,
    songCount: artist._count.artistSongs,
    popularity: artist.spotifyArtist?.popularity ?? null,
    thumbnailDefault: artist.thumbnailDefault,
    thumbnailMedium: artist.thumbnailMedium,
    thumbnailHigh: artist.thumbnailHigh,
  };
}

function clampLimit(limit?: number) {
  if (!limit || limit <= 0) return MANAGER_PAGE_SIZE;
  return Math.min(limit, MANAGER_PAGE_SIZE);
}

function buildOrderBy(sortKey?: ManagerSortKey) {
  switch (sortKey) {
    case "idDesc":
      return [{ id: "desc" }] satisfies Prisma.ArtistOrderByWithRelationInput[];
    case "popularityDesc":
      return [
        { spotifyArtist: { popularity: "desc" } },
        { id: "asc" },
      ] satisfies Prisma.ArtistOrderByWithRelationInput[];
    case "idAsc":
    default:
      return [{ id: "asc" }] satisfies Prisma.ArtistOrderByWithRelationInput[];
  }
}

function buildWhereClause(params: ManagerQueryParams): Prisma.ArtistWhereInput {
  const clauses: Prisma.ArtistWhereInput[] = [];
  const trimmed = params.searchTerm?.trim();

  if (trimmed) {
    const isNumericSearch = /^\d+$/.test(trimmed);
    if (isNumericSearch) {
      clauses.push({ id: Number(trimmed) });
    } else {
      clauses.push({
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { nameKo: { contains: trimmed, mode: "insensitive" } },
          { nameLatin: { contains: trimmed, mode: "insensitive" } },
          { nameJaKana: { contains: trimmed, mode: "insensitive" } },
          { nameJaKanji: { contains: trimmed, mode: "insensitive" } },
        ],
      });
    }
  }

  for (const filter of params.filters ?? []) {
    switch (filter) {
      case "hasSongs":
        clauses.push({ artistSongs: { some: {} } });
        break;
      case "noSongs":
        clauses.push({ artistSongs: { none: {} } });
        break;
      case "jpopOnly":
        clauses.push({
          homeCatalog: { equals: "JPOP", mode: "insensitive" },
        });
        break;
      case "missingCatalog":
        clauses.push({
          OR: [
            { homeCatalog: null },
            { homeCatalog: { equals: "", mode: "insensitive" } },
          ],
        });
        break;
      case "popularOnSpotify":
        clauses.push({
          spotifyArtist: {
            is: { popularity: { gte: 80 } },
          },
        });
        break;
      default:
        break;
    }
  }

  if (!clauses.length) {
    return {};
  }
  if (clauses.length === 1) {
    return clauses[0]!;
  }
  return { AND: clauses };
}

function buildPrecedingWhereClause(
  baseWhere: Prisma.ArtistWhereInput,
  sortKey: ManagerSortKey,
  target: { id: number; spotifyArtist: { popularity: number | null } | null },
): Prisma.ArtistWhereInput | null {
  switch (sortKey) {
    case "idDesc":
      return mergeWhere(baseWhere, { id: { gt: target.id } });
    case "popularityDesc": {
      const popularity = target.spotifyArtist?.popularity;
      if (typeof popularity === "number") {
        return mergeWhere(baseWhere, {
          OR: [
            {
              spotifyArtist: {
                is: { popularity: { gt: popularity } },
              },
            },
            {
              AND: [
                {
                  spotifyArtist: {
                    is: { popularity },
                  },
                },
                { id: { lt: target.id } },
              ],
            },
          ],
        });
      }
      return mergeWhere(baseWhere, {
        OR: [
          { spotifyArtist: { isNot: null } },
          {
            AND: [{ spotifyArtist: { is: null } }, { id: { lt: target.id } }],
          },
        ],
      });
    }
    case "idAsc":
    default:
      return mergeWhere(baseWhere, { id: { lt: target.id } });
  }
}

function mergeWhere(
  base: Prisma.ArtistWhereInput,
  addition: Prisma.ArtistWhereInput,
): Prisma.ArtistWhereInput {
  const normalizedBase = base && Object.keys(base).length > 0 ? [base] : [];
  const normalizedAddition =
    addition && Object.keys(addition).length > 0 ? [addition] : [];

  const combined = [...normalizedBase, ...normalizedAddition];
  if (!combined.length) {
    return {};
  }
  if (combined.length === 1) {
    return combined[0]!;
  }
  return { AND: combined };
}

const spotifyTrackBaseSelect = {
  id: true,
  spotifyId: true,
  spotifyUrl: true,
  name: true,
  thumbnails: true,
  durationMs: true,
  releaseDate: true,
  popularity: true,
  musicBrainzTitle: true,
  musicBrainzArtistId: true,
  createdAt: true,
  groupId: true,
  artists: {
    select: {
      spotifyArtist: {
        select: {
          spotifyId: true,
          name: true,
          artists: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SpotifyTrackSelect;

function mapSpotifyTrackSummary(track: any): ManagerSpotifyTrackSummary {
  if (!track) {
    return {
      id: 0,
      spotifyId: "",
      name: "",
      spotifyUrl: null,
      durationMs: null,
      releaseDate: null,
      popularity: null,
      thumbnails: [],
      createdAt: "",
      groupId: null,
      artists: [],
    };
  }
  return {
    id: track.id,
    spotifyId: track.spotifyId,
    name: track.name,
    spotifyUrl: track.spotifyUrl ?? null,
    durationMs: track.durationMs ?? null,
    releaseDate: track.releaseDate ?? null,
    popularity: track.popularity ?? null,
    musicBrainzTitle: track.musicBrainzTitle ?? null,
    musicBrainzArtistId: track.musicBrainzArtistId ?? null,
    thumbnails: track.thumbnails ?? [],
    createdAt:
      track.createdAt instanceof Date
        ? track.createdAt.toISOString()
        : String(track.createdAt ?? ""),
    groupId: track.groupId ?? null,
    artists:
      track.artists?.flatMap((link: any) => {
        const spotifyArtist = link.spotifyArtist;
        if (!spotifyArtist) {
          return [];
        }
        const linkedArtists = spotifyArtist.artists ?? [];
        if (!linkedArtists.length) {
          return [
            {
              artistId: null,
              spotifyName: spotifyArtist.name,
              spotifyId: spotifyArtist.spotifyId,
            },
          ];
        }
        return linkedArtists.map((artistRecord: any) => ({
          artistId: artistRecord.id,
          spotifyName: spotifyArtist.name,
          spotifyId: spotifyArtist.spotifyId,
        }));
      }) ?? [],
  };
}

export async function fetchManagerArtistDetail(
  artistId: number,
): Promise<ManagerArtistDetail | null> {
  if (!artistId || Number.isNaN(artistId)) {
    return null;
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameLatin: true,
      nameJaKana: true,
      nameJaKanji: true,
      tjName: true,
      tjNameJa: true,
      slug: true,
      homeCatalog: true,
      spotifyId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      spotifyArtist: {
        select: {
          name: true,
          popularity: true,
          followers: true,
          genres: true,
          spotifyUrl: true,
          thumbnails: true,
        },
      },
      artistSongs: {
        orderBy: { order: "asc" },
        select: {
          song: {
            select: {
              id: true,
              title: true,
              titleKo: true,
              titleLatin: true,
              catalog: true,
              youtubeVideoId: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
              tjSong: {
                select: {
                  id: true,
                  title: true,
                  artist: true,
                },
              },
              spotifyTrackGroup: {
                select: {
                  id: true,
                  primaryTrack: { select: spotifyTrackBaseSelect },
                },
              },
              karaokeSongs: {
                select: {
                  provider: true,
                  karaokeNo: true,
                },
              },
              artistSongs: {
                orderBy: { order: "asc" },
                select: {
                  order: true,
                  role: true,
                  artist: {
                    select: {
                      id: true,
                      name: true,
                      nameKo: true,
                    },
                  },
                },
              },
              youtubeVideos: {
                select: {
                  youtubeVideo: {
                    select: {
                      videoId: true,
                      title: true,
                      viewCount: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      youtubeChannels: {
        orderBy: { type: "asc" },
        select: {
          id: true,
          type: true,
          channelId: true,
          title: true,
          subscriberCount: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
        },
      },
      _count: { select: { artistSongs: true } },
    },
  });

  if (!artist) {
    return null;
  }

  const songs = artist.artistSongs.map(({ song }) => {
    // 연결된 유튜브 비디오 중 조회수가 가장 높은 것 선택
    const sortedVideos = [...(song.youtubeVideos ?? [])].sort((a, b) => {
      const viewA = Number(a.youtubeVideo.viewCount ?? 0);
      const viewB = Number(b.youtubeVideo.viewCount ?? 0);
      return viewB - viewA;
    });
    const topVideo = sortedVideos[0]?.youtubeVideo ?? null;

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      catalog: song.catalog,
      hasYoutube: sortedVideos.length > 0,
      youtubeVideoId: topVideo?.videoId ?? song.youtubeVideoId,
      topYoutubeVideo: topVideo
        ? {
            videoId: topVideo.videoId,
            title: topVideo.title,
            viewCount: topVideo.viewCount?.toString() ?? null,
          }
        : null,
      thumbnails: {
        default: song.thumbnailDefault,
        medium: song.thumbnailMedium,
        high: song.thumbnailHigh,
      },
      spotifyGroup: song.spotifyTrackGroup
        ? {
            id: song.spotifyTrackGroup.id,
            primaryTrack: song.spotifyTrackGroup.primaryTrack
              ? mapSpotifyTrackSummary(song.spotifyTrackGroup.primaryTrack)
              : null,
          }
        : null,
      tjSong: song.tjSong
        ? {
            id: song.tjSong.id,
            title: song.tjSong.title,
            artist: song.tjSong.artist,
          }
        : null,
      karaoke: song.karaokeSongs.map((item) => ({
        provider: String(item.provider),
        karaokeNo: item.karaokeNo,
      })),
      artists: song.artistSongs.map((as) => ({
        id: as.artist.id,
        name: as.artist.name,
        nameKo: as.artist.nameKo,
        role: as.role ?? null,
        order: as.order,
      })),
    };
  });

  return {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameLatin: artist.nameLatin,
    nameJa: artist.nameJaKanji ?? artist.nameJaKana,
    nameJaKana: artist.nameJaKana,
    nameJaKanji: artist.nameJaKanji,
    tjName: artist.tjName,
    tjNameJa: artist.tjNameJa,
    catalog: artist.homeCatalog,
    slug: artist.slug,
    spotifyId: artist.spotifyId,
    songCount: artist._count.artistSongs,
    thumbnails: {
      default: artist.thumbnailDefault,
      medium: artist.thumbnailMedium,
      high: artist.thumbnailHigh,
    },
    spotify: artist.spotifyArtist
      ? {
          name: artist.spotifyArtist.name,
          thumbnails: artist.spotifyArtist.thumbnails,
          popularity: artist.spotifyArtist.popularity,
          followers: artist.spotifyArtist.followers,
          genres: artist.spotifyArtist.genres ?? [],
          url: artist.spotifyArtist.spotifyUrl,
        }
      : null,
    youtubeChannels: artist.youtubeChannels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      channelId: channel.channelId,
      title: channel.title,
      subscriberCount: channel.subscriberCount,
      thumbnails: {
        default: channel.thumbnailDefault,
        medium: channel.thumbnailMedium,
        high: channel.thumbnailHigh,
      },
    })),
    songs,
  };
}

// 아티스트 정보만 가져오기 (곡 목록 제외)
export async function fetchManagerArtistInfo(
  artistId: number,
): Promise<ManagerArtistInfo | null> {
  if (!artistId || Number.isNaN(artistId)) {
    return null;
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameLatin: true,
      nameJaKana: true,
      nameJaKanji: true,
      tjName: true,
      tjNameJa: true,
      slug: true,
      homeCatalog: true,
      spotifyId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      spotifyArtist: {
        select: {
          name: true,
          popularity: true,
          followers: true,
          genres: true,
          spotifyUrl: true,
          thumbnails: true,
        },
      },
      youtubeChannels: {
        orderBy: { type: "asc" },
        select: {
          id: true,
          type: true,
          channelId: true,
          title: true,
          subscriberCount: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
        },
      },
      _count: { select: { artistSongs: true } },
    },
  });

  if (!artist) {
    return null;
  }

  return {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameLatin: artist.nameLatin,
    nameJa: artist.nameJaKanji ?? artist.nameJaKana,
    nameJaKana: artist.nameJaKana,
    nameJaKanji: artist.nameJaKanji,
    tjName: artist.tjName,
    tjNameJa: artist.tjNameJa,
    catalog: artist.homeCatalog,
    slug: artist.slug,
    spotifyId: artist.spotifyId,
    songCount: artist._count.artistSongs,
    thumbnails: {
      default: artist.thumbnailDefault,
      medium: artist.thumbnailMedium,
      high: artist.thumbnailHigh,
    },
    spotify: artist.spotifyArtist
      ? {
          name: artist.spotifyArtist.name,
          thumbnails: artist.spotifyArtist.thumbnails,
          popularity: artist.spotifyArtist.popularity,
          followers: artist.spotifyArtist.followers,
          genres: artist.spotifyArtist.genres ?? [],
          url: artist.spotifyArtist.spotifyUrl,
        }
      : null,
    youtubeChannels: artist.youtubeChannels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      channelId: channel.channelId,
      title: channel.title,
      subscriberCount: channel.subscriberCount,
      thumbnails: {
        default: channel.thumbnailDefault,
        medium: channel.thumbnailMedium,
        high: channel.thumbnailHigh,
      },
    })),
  };
}

// 아티스트 곡 목록만 가져오기
export async function fetchManagerArtistSongs(
  artistId: number,
): Promise<ManagerArtistSongsResult | null> {
  if (!artistId || Number.isNaN(artistId)) {
    return null;
  }

  const artistSongs = await prisma.artistSong.findMany({
    where: { artistId },
    orderBy: { order: "asc" },
    select: {
      song: {
        select: {
          id: true,
          title: true,
          titleKo: true,
          titleLatin: true,
          titleJaKana: true,
          titleJaKanji: true,
          catalog: true,
          youtubeVideoId: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
          tjSong: {
            select: {
              id: true,
              title: true,
              artist: true,
            },
          },
          spotifyTrackGroup: {
            select: {
              id: true,
              primaryTrack: { select: spotifyTrackBaseSelect },
            },
          },
          karaokeSongs: {
            select: {
              provider: true,
              karaokeNo: true,
            },
          },
          artistSongs: {
            orderBy: { order: "asc" },
            select: {
              order: true,
              role: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                  nameKo: true,
                },
              },
            },
          },
          youtubeVideos: {
            select: {
              youtubeVideo: {
                select: {
                  videoId: true,
                  title: true,
                  viewCount: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // TJSong이 없는 곡들의 ID를 모아서 신청곡 최대 hit 값 조회
  const songIdsWithoutTj = artistSongs
    .filter(({ song }) => !song.tjSong)
    .map(({ song }) => song.id);

  const maxProposeHitMap = new Map<number, number>();
  if (songIdsWithoutTj.length > 0) {
    const proposeMaxHits = await prisma.songPropose.groupBy({
      by: ["songId"],
      where: {
        songId: { in: songIdsWithoutTj },
      },
      _max: {
        hit: true,
      },
    });
    for (const item of proposeMaxHits) {
      if (item.songId && item._max.hit) {
        maxProposeHitMap.set(item.songId, item._max.hit);
      }
    }
  }

  const songs: ManagerArtistSongDetail[] = artistSongs.map(({ song }) => {
    const sortedVideos = [...(song.youtubeVideos ?? [])].sort((a, b) => {
      const viewA = Number(a.youtubeVideo.viewCount ?? 0);
      const viewB = Number(b.youtubeVideo.viewCount ?? 0);
      return viewB - viewA;
    });
    const topVideo = sortedVideos[0]?.youtubeVideo ?? null;

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      titleJaKana: song.titleJaKana,
      titleJaKanji: song.titleJaKanji,
      catalog: song.catalog,
      hasYoutube: sortedVideos.length > 0,
      youtubeVideoId: topVideo?.videoId ?? song.youtubeVideoId,
      topYoutubeVideo: topVideo
        ? {
            videoId: topVideo.videoId,
            title: topVideo.title,
            viewCount: topVideo.viewCount?.toString() ?? null,
          }
        : null,
      thumbnails: {
        default: song.thumbnailDefault,
        medium: song.thumbnailMedium,
        high: song.thumbnailHigh,
      },
      spotifyGroup: song.spotifyTrackGroup
        ? {
            id: song.spotifyTrackGroup.id,
            primaryTrack: song.spotifyTrackGroup.primaryTrack
              ? mapSpotifyTrackSummary(song.spotifyTrackGroup.primaryTrack)
              : null,
          }
        : null,
      tjSong: song.tjSong
        ? {
            id: song.tjSong.id,
            title: song.tjSong.title,
            artist: song.tjSong.artist,
          }
        : null,
      maxProposeHit: maxProposeHitMap.get(song.id) ?? null,
      karaoke: song.karaokeSongs.map((item) => ({
        provider: String(item.provider),
        karaokeNo: item.karaokeNo,
      })),
      artists: song.artistSongs.map((as) => ({
        id: as.artist.id,
        name: as.artist.name,
        nameKo: as.artist.nameKo,
        role: as.role ?? null,
        order: as.order,
      })),
    };
  });

  return {
    artistId,
    songs,
  };
}

export async function fetchManagerArtistSpotifyPanel(
  artistId: number,
): Promise<ManagerSpotifyPanelData> {
  if (!artistId || Number.isNaN(artistId)) {
    return { groups: [], orphanTracks: [] };
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { spotifyId: true },
  });

  if (!artist?.spotifyId) {
    return { groups: [], orphanTracks: [] };
  }

  const [artistTracks, artistSongLinks] = await Promise.all([
    prisma.spotifyArtistTrack.findMany({
      where: { spotifyArtist: { spotifyId: artist.spotifyId } },
      select: {
        spotifyTrack: {
          select: {
            ...spotifyTrackBaseSelect,
            group: {
              select: {
                id: true,
                primaryTrack: { select: spotifyTrackBaseSelect },
                _count: { select: { tracks: true } },
              },
            },
          },
        },
      },
      orderBy: { spotifyTrack: { name: "asc" } },
    }),
    prisma.artistSong.findMany({
      where: { artistId },
      select: {
        song: {
          select: {
            id: true,
            title: true,
            titleKo: true,
            spotifyTrackGroupId: true,
          },
        },
      },
    }),
  ]);

  const linkedSongMap = new Map<
    number,
    Array<{ id: number; title: string; titleKo?: string | null }>
  >();
  for (const link of artistSongLinks) {
    const groupId = link.song.spotifyTrackGroupId;
    if (!groupId) continue;
    if (!linkedSongMap.has(groupId)) {
      linkedSongMap.set(groupId, []);
    }
    linkedSongMap.get(groupId)!.push({
      id: link.song.id,
      title: link.song.title,
      titleKo: link.song.titleKo ?? null,
    });
  }

  const groupsAccumulator = new Map<
    number,
    {
      groupId: number;
      trackCount: number;
      artistTrackCount: number;
      primaryTrack: ManagerSpotifyTrackSummary;
      tracks: ManagerSpotifyTrackSummary[];
    }
  >();
  const orphanTracks: ManagerSpotifyTrackSummary[] = [];

  const mapTrack = (track: any): ManagerSpotifyTrackSummary =>
    mapSpotifyTrackSummary(track);

  for (const record of artistTracks) {
    const track = record.spotifyTrack;
    if (!track) continue;
    const summary = mapTrack(track);

    if (track.groupId && track.group) {
      const fallbackPrimary = track.group.primaryTrack
        ? mapTrack(track.group.primaryTrack)
        : summary;
      const existing = groupsAccumulator.get(track.group.id);
      if (existing) {
        existing.artistTrackCount += 1;
        existing.tracks.push(summary);
        if (!existing.primaryTrack && fallbackPrimary) {
          existing.primaryTrack = fallbackPrimary;
        }
      } else {
        groupsAccumulator.set(track.group.id, {
          groupId: track.group.id,
          trackCount: track.group._count?.tracks ?? 0,
          artistTrackCount: 1,
          primaryTrack: fallbackPrimary,
          tracks: [summary],
        });
      }
    } else {
      orphanTracks.push(summary);
    }
  }

  const groups = Array.from(groupsAccumulator.values())
    .map((group) => ({
      ...group,
      linkedSongs: linkedSongMap.get(group.groupId) ?? [],
    }))
    .sort((a, b) => {
      const popularityA = a.primaryTrack.popularity ?? -1;
      const popularityB = b.primaryTrack.popularity ?? -1;
      if (popularityA !== popularityB) {
        return popularityB - popularityA;
      }
      const dateA = a.primaryTrack.releaseDate ?? "";
      const dateB = b.primaryTrack.releaseDate ?? "";
      return dateB.localeCompare(dateA);
    });

  return {
    groups,
    orphanTracks: orphanTracks.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export type UpdateArtistNamesInput = {
  artistId: number;
  name: string;
  nameKo: string;
  nameJaKana?: string | null;
  nameJaKanji?: string | null;
  nameLatin?: string | null;
  tjName?: string | null;
  tjNameJa?: string | null;
  slug?: string | null;
  catalog?: "미정" | "KPOP" | "JPOP" | "POP";
};

export async function updateArtistNames({
  artistId,
  name,
  nameKo,
  nameJaKana,
  nameJaKanji,
  nameLatin,
  tjName,
  tjNameJa,
  slug,
  catalog,
}: UpdateArtistNamesInput) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }

  const sanitized = {
    name: name.trim(),
    nameKo: nameKo.trim(),
    nameJaKana: nameJaKana?.trim() || null,
    nameJaKanji: nameJaKanji?.trim() || null,
    nameLatin: nameLatin?.trim() || null,
    tjName: tjName?.trim() || null,
    tjNameJa: tjNameJa?.trim() || null,
    slug: slug?.trim() ? slug.trim() : null,
    homeCatalog:
      catalog && catalog !== "미정"
        ? catalog
        : catalog === "미정"
          ? null
          : undefined,
  };

  if (!sanitized.name || !sanitized.nameKo) {
    throw new Error("이름과 한국어 이름은 필수입니다.");
  }

  const data: Prisma.ArtistUpdateInput = {
    name: sanitized.name,
    nameKo: sanitized.nameKo,
    nameJaKana: sanitized.nameJaKana,
    nameJaKanji: sanitized.nameJaKanji,
    nameLatin: sanitized.nameLatin,
    tjName: sanitized.tjName,
    tjNameJa: sanitized.tjNameJa,
    slug: sanitized.slug,
  };
  if (sanitized.homeCatalog !== undefined) {
    data.homeCatalog = sanitized.homeCatalog;
  }

  const artist = await prisma.artist.update({
    where: { id: artistId },
    data,
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameJaKana: true,
      nameJaKanji: true,
      nameLatin: true,
      tjName: true,
      tjNameJa: true,
      slug: true,
      homeCatalog: true,
    },
  });

  return artist;
}

export type CreateArtistInput = {
  name: string;
  nameKo: string;
  slug?: string | null;
  catalog?: "미정" | "KPOP" | "JPOP" | "POP";
};

export async function createArtist({
  name,
  nameKo,
  slug,
  catalog,
}: CreateArtistInput): Promise<ManagerArtistSummary> {
  const trimmedName = name.trim();
  const trimmedNameKo = nameKo.trim();
  if (!trimmedName || !trimmedNameKo) {
    throw new Error("이름과 한국어 이름은 필수입니다.");
  }
  const data: Prisma.ArtistCreateInput = {
    name: trimmedName,
    nameKo: trimmedNameKo,
    slug: slug?.trim() || null,
  };
  if (catalog) {
    data.homeCatalog = catalog === "미정" ? null : catalog;
  }
  const payload = await prisma.artist.create({
    data,
    select: artistSelect,
  });
  return mapArtistRecord(payload);
}

export type UpdateArtistSpotifyIdInput = {
  artistId: number;
  spotifyId?: string | null;
};

export async function updateArtistSpotifyId({
  artistId,
  spotifyId,
}: UpdateArtistSpotifyIdInput) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  const value = spotifyId?.trim() ? spotifyId.trim() : null;
  const artist = await prisma.artist.update({
    where: { id: artistId },
    data: { spotifyId: value },
    select: { id: true, spotifyId: true },
  });
  return artist;
}

export async function deleteArtist(artistId: number) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  const deleted = await prisma.artist.delete({
    where: { id: artistId },
    select: { id: true },
  });
  return deleted;
}

export type MergeArtistInput = {
  sourceArtistId: number;
  targetArtistId: number;
};

export async function mergeArtist({
  sourceArtistId,
  targetArtistId,
}: MergeArtistInput) {
  if (
    !sourceArtistId ||
    Number.isNaN(sourceArtistId) ||
    !targetArtistId ||
    Number.isNaN(targetArtistId)
  ) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  if (sourceArtistId === targetArtistId) {
    throw new Error("동일한 아티스트로 병합할 수 없습니다.");
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.artist.findUnique({
      where: { id: targetArtistId },
      select: { id: true },
    });
    if (!target) {
      throw new Error("대상 아티스트를 찾을 수 없습니다.");
    }
    const source = await tx.artist.findUnique({
      where: { id: sourceArtistId },
      select: { id: true },
    });
    if (!source) {
      throw new Error("현재 아티스트를 찾을 수 없습니다.");
    }

    const artistSongs = await tx.artistSong.findMany({
      where: { artistId: sourceArtistId },
      select: { songId: true, order: true, role: true },
    });

    if (artistSongs.length > 0) {
      await tx.artistSong.createMany({
        data: artistSongs.map((song) => ({
          artistId: targetArtistId,
          songId: song.songId,
          order: song.order,
          role: song.role,
        })),
        skipDuplicates: true,
      });
    }

    await tx.artistSong.deleteMany({ where: { artistId: sourceArtistId } });
    await tx.artist.delete({ where: { id: sourceArtistId } });
  });

  return { merged: true };
}

export type ArtistAlias = {
  id: number;
  alias: string;
  locale: string;
  kind: string;
  source: string;
};

export async function fetchArtistAliases(
  artistId: number,
): Promise<ArtistAlias[]> {
  if (!artistId || Number.isNaN(artistId)) {
    return [];
  }

  const aliases = await prisma.artistAlias.findMany({
    where: { artistId },
    select: {
      id: true,
      alias: true,
      locale: true,
      kind: true,
      source: true,
    },
    orderBy: [{ locale: "asc" }, { kind: "asc" }, { alias: "asc" }],
  });

  return aliases;
}

// Union-Find for grouping videos by connected songs
class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
    }
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent.set(rootX, rootY);
    }
  }

  getGroups(items: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const item of items) {
      const root = this.find(item);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(item);
    }
    return groups;
  }
}

export async function fetchManagerArtistYoutubePanel(
  artistId: number,
): Promise<ManagerYoutubePanelData> {
  if (!artistId || Number.isNaN(artistId)) {
    return { channel: null, groups: [], orphanVideos: [] };
  }

  const topicChannel = await prisma.youtubeChannel.findFirst({
    where: { artistId, type: "TOPIC" },
    select: {
      id: true,
      channelId: true,
      title: true,
      thumbnailMedium: true,
      subscriberCount: true,
      videoCount: true,
    },
  });

  if (!topicChannel) {
    return { channel: null, groups: [], orphanVideos: [] };
  }

  // 채널의 비디오들 가져오기
  const channelVideos = await prisma.youtubeChannelVideo.findMany({
    where: { youtubeChannelId: topicChannel.id },
    select: {
      youtubeVideo: {
        select: {
          videoId: true,
          title: true,
          publishedAt: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
          viewCount: true,
          likeCount: true,
          durationSeconds: true,
        },
      },
    },
    orderBy: { youtubeVideo: { publishedAt: "desc" } },
  });

  const videoIds = channelVideos.map((v) => v.youtubeVideo.videoId);
  const videoMap = new Map(
    channelVideos.map((v) => [
      v.youtubeVideo.videoId,
      {
        videoId: v.youtubeVideo.videoId,
        title: v.youtubeVideo.title,
        publishedAt: v.youtubeVideo.publishedAt?.toISOString() ?? null,
        thumbnailMedium: v.youtubeVideo.thumbnailMedium,
        thumbnailHigh: v.youtubeVideo.thumbnailHigh,
        viewCount: v.youtubeVideo.viewCount?.toString() ?? null,
        likeCount: v.youtubeVideo.likeCount,
        durationSeconds: v.youtubeVideo.durationSeconds,
      },
    ]),
  );

  // 아티스트의 Song들과 연결된 비디오 매핑 가져오기
  const songVideoMappings = await prisma.songYoutubeVideo.findMany({
    where: {
      youtubeVideoId: { in: videoIds },
      song: {
        artistSongs: {
          some: { artistId },
        },
      },
    },
    select: {
      songId: true,
      youtubeVideoId: true,
      song: {
        select: {
          id: true,
          title: true,
          titleKo: true,
          spotifyTrackGroup: {
            select: {
              primaryTrack: { select: { popularity: true } },
            },
          },
        },
      },
    },
  });

  // Song별 비디오들 그룹화
  const songToVideos = new Map<number, string[]>();
  const videoToSongs = new Map<string, Set<number>>();
  const songInfoMap = new Map<
    number,
    {
      id: number;
      title: string;
      titleKo: string | null;
      primaryPopularity: number | null;
    }
  >();

  for (const mapping of songVideoMappings) {
    // Song -> Videos
    if (!songToVideos.has(mapping.songId)) {
      songToVideos.set(mapping.songId, []);
    }
    songToVideos.get(mapping.songId)!.push(mapping.youtubeVideoId);

    // Video -> Songs
    if (!videoToSongs.has(mapping.youtubeVideoId)) {
      videoToSongs.set(mapping.youtubeVideoId, new Set());
    }
    videoToSongs.get(mapping.youtubeVideoId)!.add(mapping.songId);

    // Song info
    songInfoMap.set(mapping.songId, {
      id: mapping.song.id,
      title: mapping.song.title,
      titleKo: mapping.song.titleKo,
      primaryPopularity:
        mapping.song.spotifyTrackGroup?.primaryTrack?.popularity ?? null,
    });
  }

  // Union-Find로 같은 Song에 연결된 비디오들 그룹화
  const uf = new UnionFind();
  const linkedVideoIds = new Set<string>();

  for (const [, videos] of songToVideos) {
    if (videos.length > 0) {
      const first = videos[0]!;
      linkedVideoIds.add(first);
      for (let i = 1; i < videos.length; i++) {
        linkedVideoIds.add(videos[i]!);
        uf.union(first, videos[i]!);
      }
    }
  }

  // 그룹 생성

  const groupsRaw: Array<{
    videos: Array<{
      videoId: string;
      title: string | null;
      publishedAt: string | null;
      thumbnailMedium: string | null;
      thumbnailHigh: string | null;
      viewCount: string | null;
      likeCount: number | null;
      durationSeconds: number | null;
    }>;
    linkedSongs: Array<{
      id: number;
      title: string;
      titleKo?: string | null;
      primaryPopularity: number | null;
    }>;
    sortPopularity: number; // 정렬용 (노출 안 해도 됨)
  }> = [];

  const videoGroups = uf.getGroups(Array.from(linkedVideoIds));
  for (const [, groupVideoIds] of videoGroups) {
    const linkedSongIds = new Set<number>();
    for (const videoId of groupVideoIds) {
      const songIds = videoToSongs.get(videoId);
      if (songIds) for (const songId of songIds) linkedSongIds.add(songId);
    }

    const linkedSongs = Array.from(linkedSongIds)
      .map((songId) => songInfoMap.get(songId)!)
      .filter(Boolean)
      .sort((a, b) => a.id - b.id);

    const videos = groupVideoIds
      .map((videoId) => videoMap.get(videoId)!)
      .filter(Boolean)
      .sort((a, b) => {
        const viewA = Number.parseInt(a.viewCount ?? "0", 10) || 0;
        const viewB = Number.parseInt(b.viewCount ?? "0", 10) || 0;
        if (viewA !== viewB) return viewB - viewA;

        const dateA = a.publishedAt ?? "";
        const dateB = b.publishedAt ?? "";
        return dateB.localeCompare(dateA);
      });

    const sortPopularity = linkedSongs.reduce((max, s) => {
      const p =
        typeof s.primaryPopularity === "number" ? s.primaryPopularity : -1;
      return Math.max(max, p);
    }, -1);

    groupsRaw.push({ videos, linkedSongs, sortPopularity });
  }

  // 그룹 정렬: linkedSongs 수 내림차순, 그 다음 videos 수 내림차순
  groupsRaw.sort((a, b) => {
    if (b.sortPopularity !== a.sortPopularity)
      return b.sortPopularity - a.sortPopularity;

    // tie-breaker (원하시면 바꾸셔도 됩니다)
    if (b.linkedSongs.length !== a.linkedSongs.length)
      return b.linkedSongs.length - a.linkedSongs.length;
    if (b.videos.length !== a.videos.length)
      return b.videos.length - a.videos.length;

    const dateA = a.videos[0]?.publishedAt ?? "";
    const dateB = b.videos[0]?.publishedAt ?? "";
    return dateB.localeCompare(dateA);
  });

  // orphan 비디오들 (매핑이 없는 비디오)
  const orphanVideos = videoIds
    .filter((videoId) => !linkedVideoIds.has(videoId))
    .map((videoId) => videoMap.get(videoId)!)
    .filter(Boolean);

  const groups = groupsRaw.map((g, idx) => ({
    groupIndex: idx + 1,
    videos: g.videos,
    linkedSongs: g.linkedSongs.map(({ primaryPopularity, ...rest }) => rest), // 노출 원치 않으면 제거
  }));

  return {
    channel: {
      id: topicChannel.id,
      channelId: topicChannel.channelId,
      title: topicChannel.title,
      thumbnailMedium: topicChannel.thumbnailMedium,
      subscriberCount: topicChannel.subscriberCount,
      videoCount: topicChannel.videoCount,
    },
    groups,
    orphanVideos,
  };
}

export type UpdateSongInput = {
  songId: number;
  title?: string;
  titleKo?: string;
  titleLatin?: string;
  titleJaKana?: string | null;
  titleJaKanji?: string | null;
  catalog?: string;
  youtubeVideoId?: string;
};

export async function updateSong(input: UpdateSongInput) {
  const { songId, ...data } = input;

  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  const sanitizedData = {
    title: data.title?.trim(),
    titleKo: data.titleKo?.trim(),
    titleLatin: data.titleLatin?.trim() || null,
    titleJaKana: data.titleJaKana?.trim() || null,
    titleJaKanji: data.titleJaKanji?.trim() || null,
    catalog: data.catalog?.trim() || null,
    youtubeVideoId: data.youtubeVideoId?.trim() || null,
  };

  const updatedSong = await prisma.song.update({
    where: { id: songId },
    data: sanitizedData,
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJaKana: true,
      titleJaKanji: true,
      catalog: true,
      youtubeVideoId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      tjSong: {
        select: {
          id: true,
          title: true,
          artist: true,
        },
      },
      spotifyTrackGroup: {
        select: {
          id: true,
          primaryTrack: { select: spotifyTrackBaseSelect },
        },
      },
      karaokeSongs: {
        select: {
          provider: true,
          karaokeNo: true,
        },
      },
    },
  });

  // 아티스트 정보도 다시 가져와서 반환
  const songWithArtists = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      artistSongs: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          role: true,
          artist: {
            select: {
              id: true,
              name: true,
              nameKo: true,
            },
          },
        },
      },
    },
  });

  return {
    id: updatedSong.id,
    title: updatedSong.title,
    titleKo: updatedSong.titleKo,
    titleLatin: updatedSong.titleLatin,
    titleJaKana: updatedSong.titleJaKana,
    titleJaKanji: updatedSong.titleJaKanji,
    catalog: updatedSong.catalog,
    hasYoutube: Boolean(updatedSong.youtubeVideoId),
    youtubeVideoId: updatedSong.youtubeVideoId,
    thumbnails: {
      default: updatedSong.thumbnailDefault,
      medium: updatedSong.thumbnailMedium,
      high: updatedSong.thumbnailHigh,
    },
    spotifyGroup: updatedSong.spotifyTrackGroup
      ? {
          id: updatedSong.spotifyTrackGroup.id,
          primaryTrack: updatedSong.spotifyTrackGroup.primaryTrack
            ? mapSpotifyTrackSummary(updatedSong.spotifyTrackGroup.primaryTrack)
            : null,
        }
      : null,
    tjSong: updatedSong.tjSong
      ? {
          id: updatedSong.tjSong.id,
          title: updatedSong.tjSong.title,
          artist: updatedSong.tjSong.artist,
        }
      : null,
    karaoke: updatedSong.karaokeSongs.map((item) => ({
      provider: String(item.provider),
      karaokeNo: item.karaokeNo,
    })),
    artists:
      songWithArtists?.artistSongs.map((as) => ({
        id: as.artist.id,
        name: as.artist.name,
        nameKo: as.artist.nameKo,
        role: as.role ?? null,
        order: as.order,
      })) ?? [],
  };
}

// 곡 삭제
export async function deleteSong(songId: number): Promise<void> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  // 연결된 데이터 삭제 (cascade가 아닌 경우 수동으로 삭제)
  await prisma.$transaction(async (tx) => {
    // ArtistSong 연결 삭제
    await tx.artistSong.deleteMany({ where: { songId } });

    // SongYoutubeVideo 연결 삭제
    await tx.songYoutubeVideo.deleteMany({ where: { songId } });

    // KaraokeSong 연결 삭제
    await tx.karaokeSong.deleteMany({ where: { songId } });

    // SongAlias 삭제
    await tx.songAlias.deleteMany({ where: { songId } });

    // SongPropose의 songId를 null로 설정
    await tx.songPropose.updateMany({
      where: { songId },
      data: { songId: null },
    });

    // 곡 삭제 (spotifyTrackGroupId는 Song 측에 있으므로 별도 처리 불필요)
    await tx.song.delete({ where: { id: songId } });
  });
}

// 곡에 연결된 아티스트 목록 조회
export async function fetchSongArtists(
  songId: number,
): Promise<SongLinkedArtist[]> {
  if (!songId || Number.isNaN(songId)) {
    return [];
  }

  const artistSongs = await prisma.artistSong.findMany({
    where: { songId },
    orderBy: { order: "asc" },
    select: {
      order: true,
      role: true,
      artist: {
        select: {
          id: true,
          name: true,
          nameKo: true,
        },
      },
    },
  });

  return artistSongs.map((as) => ({
    id: as.artist.id,
    name: as.artist.name,
    nameKo: as.artist.nameKo,
    role: as.role ?? null,
    order: as.order,
  }));
}

// 아티스트 검색 (곡에 연결할 아티스트 찾기용)
export async function searchArtistsForLink(
  searchTerm: string,
  limit = 20,
): Promise<Array<{ id: number; name: string; nameKo: string }>> {
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return [];
  }

  const isNumericSearch = /^\d+$/.test(trimmed);

  const artists = await prisma.artist.findMany({
    where: isNumericSearch
      ? { id: Number(trimmed) }
      : {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { nameKo: { contains: trimmed, mode: "insensitive" } },
            { nameLatin: { contains: trimmed, mode: "insensitive" } },
            { nameJaKana: { contains: trimmed, mode: "insensitive" } },
            { nameJaKanji: { contains: trimmed, mode: "insensitive" } },
          ],
        },
    take: limit,
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });

  return artists;
}

// 곡에 아티스트 연결
export type LinkSongArtistInput = {
  songId: number;
  artistId: number;
  role?: "MAIN" | "FEATURING" | "PRODUCER" | null;
};

export async function linkSongArtist({
  songId,
  artistId,
  role,
}: LinkSongArtistInput): Promise<SongLinkedArtist[]> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }

  // 이미 연결된지 확인
  const existing = await prisma.artistSong.findUnique({
    where: {
      artistId_songId: { artistId, songId },
    },
  });

  if (existing) {
    throw new Error("이미 연결된 아티스트입니다.");
  }

  // 현재 가장 높은 order 값 찾기
  const maxOrder = await prisma.artistSong.aggregate({
    where: { songId },
    _max: { order: true },
  });

  const newOrder = (maxOrder._max.order ?? -1) + 1;

  await prisma.artistSong.create({
    data: {
      songId,
      artistId,
      order: newOrder,
      role: role ?? null,
    },
  });

  return fetchSongArtists(songId);
}

// 곡에서 아티스트 연결 해제
export type UnlinkSongArtistInput = {
  songId: number;
  artistId: number;
};

export async function unlinkSongArtist({
  songId,
  artistId,
}: UnlinkSongArtistInput): Promise<SongLinkedArtist[]> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }

  await prisma.artistSong.delete({
    where: {
      artistId_songId: { artistId, songId },
    },
  });

  return fetchSongArtists(songId);
}

export async function fetchManagerArtistTjPanel(
  artistId: number,
): Promise<ManagerTjPanelData> {
  if (!artistId || Number.isNaN(artistId)) {
    return { tjName: null, tjNameJa: null, groups: [], orphanProposes: [], totalCount: 0 };
  }

  // 아티스트의 tjName, tjNameJa 가져오기
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { tjName: true, tjNameJa: true },
  });

  if (!artist?.tjName && !artist?.tjNameJa) {
    return { tjName: null, tjNameJa: null, groups: [], orphanProposes: [], totalCount: 0 };
  }

  const singerNames: string[] = [];
  if (artist.tjName) singerNames.push(artist.tjName);
  if (artist.tjNameJa) singerNames.push(artist.tjNameJa);

  // 해당 가수명으로 된 SongPropose 조회
  const proposes = await prisma.songPropose.findMany({
    where: {
      songSinger: { in: singerNames },
    },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
      hit: true,
      regdateView: true,
      songId: true,
      song: {
        select: {
          id: true,
          title: true,
          titleKo: true,
        },
      },
    },
    orderBy: { hit: "desc" },
  });

  // songId로 그룹화 (songId가 있는 것들)
  const groupedBySongId = new Map<
    number,
    {
      proposes: ManagerTjProposeSummary[];
      linkedSong: { id: number; title: string; titleKo?: string | null };
      maxHit: number;
    }
  >();
  const orphanProposes: ManagerTjProposeSummary[] = [];

  for (const propose of proposes) {
    const summary: ManagerTjProposeSummary = {
      id: propose.id,
      songTitle: propose.songTitle,
      songSinger: propose.songSinger,
      hit: propose.hit,
      regdateView: propose.regdateView,
      songId: propose.songId,
      linkedSong: propose.song
        ? {
            id: propose.song.id,
            title: propose.song.title,
            titleKo: propose.song.titleKo ?? undefined,
          }
        : null,
    };

    if (propose.songId && propose.song) {
      const existing = groupedBySongId.get(propose.songId);
      if (existing) {
        existing.proposes.push(summary);
        existing.maxHit = Math.max(existing.maxHit, propose.hit);
      } else {
        groupedBySongId.set(propose.songId, {
          proposes: [summary],
          linkedSong: {
            id: propose.song.id,
            title: propose.song.title,
            titleKo: propose.song.titleKo ?? undefined,
          },
          maxHit: propose.hit,
        });
      }
    } else {
      orphanProposes.push(summary);
    }
  }

  // 그룹 배열로 변환하고 maxHit 기준 내림차순 정렬
  const groupsArray = Array.from(groupedBySongId.values())
    .sort((a, b) => b.maxHit - a.maxHit)
    .map((group, idx) => ({
      groupIndex: idx + 1,
      proposes: group.proposes.sort((a, b) => b.hit - a.hit),
      maxHit: group.maxHit,
      linkedSong: group.linkedSong,
    }));

  return {
    tjName: artist.tjName,
    tjNameJa: artist.tjNameJa,
    groups: groupsArray,
    orphanProposes: orphanProposes.sort((a, b) => b.hit - a.hit),
    totalCount: proposes.length,
  };
}

// 곡 생성 및 아티스트 연결
export type CreateSongInput = {
  title: string;
  titleKo?: string;
  titleLatin?: string;
  titleJaKana?: string;
  titleJaKanji?: string;
  catalog?: string;
  artistId: number; // 연결할 아티스트 ID
};

export async function createSong({
  title,
  titleKo,
  titleLatin,
  titleJaKana,
  titleJaKanji,
  catalog,
  artistId,
}: CreateSongInput): Promise<ManagerArtistSongDetail> {
  if (!title.trim()) {
    throw new Error("곡 제목은 필수입니다.");
  }
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }

  const song = await prisma.song.create({
    data: {
      title: title.trim(),
      titleKo: titleKo?.trim() || null,
      titleLatin: titleLatin?.trim() || null,
      titleJaKana: titleJaKana?.trim() || null,
      titleJaKanji: titleJaKanji?.trim() || null,
      catalog: catalog?.trim() || null,
      artistSongs: {
        create: {
          artistId,
          order: 0,
        },
      },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJaKana: true,
      titleJaKanji: true,
      catalog: true,
      youtubeVideoId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      tjSong: {
        select: {
          id: true,
          title: true,
          artist: true,
        },
      },
      spotifyTrackGroup: {
        select: {
          id: true,
          primaryTrack: { select: spotifyTrackBaseSelect },
        },
      },
      karaokeSongs: {
        select: {
          provider: true,
          karaokeNo: true,
        },
      },
      artistSongs: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          role: true,
          artist: {
            select: {
              id: true,
              name: true,
              nameKo: true,
            },
          },
        },
      },
      youtubeVideos: {
        select: {
          youtubeVideo: {
            select: {
              videoId: true,
              title: true,
              viewCount: true,
            },
          },
        },
      },
    },
  });

  const sortedVideos = [...(song.youtubeVideos ?? [])].sort((a, b) => {
    const viewA = Number(a.youtubeVideo.viewCount ?? 0);
    const viewB = Number(b.youtubeVideo.viewCount ?? 0);
    return viewB - viewA;
  });
  const topVideo = sortedVideos[0]?.youtubeVideo ?? null;

  return {
    id: song.id,
    title: song.title,
    titleKo: song.titleKo,
    titleLatin: song.titleLatin,
    titleJaKana: song.titleJaKana,
    titleJaKanji: song.titleJaKanji,
    catalog: song.catalog,
    hasYoutube: sortedVideos.length > 0,
    youtubeVideoId: topVideo?.videoId ?? song.youtubeVideoId,
    topYoutubeVideo: topVideo
      ? {
          videoId: topVideo.videoId,
          title: topVideo.title,
          viewCount: topVideo.viewCount?.toString() ?? null,
        }
      : null,
    thumbnails: {
      default: song.thumbnailDefault,
      medium: song.thumbnailMedium,
      high: song.thumbnailHigh,
    },
    spotifyGroup: song.spotifyTrackGroup
      ? {
          id: song.spotifyTrackGroup.id,
          primaryTrack: song.spotifyTrackGroup.primaryTrack
            ? mapSpotifyTrackSummary(song.spotifyTrackGroup.primaryTrack)
            : null,
        }
      : null,
    tjSong: song.tjSong
      ? {
          id: song.tjSong.id,
          title: song.tjSong.title,
          artist: song.tjSong.artist,
        }
      : null,
    maxProposeHit: null,
    karaoke: song.karaokeSongs.map((item) => ({
      provider: String(item.provider),
      karaokeNo: item.karaokeNo,
    })),
    artists: song.artistSongs.map((as) => ({
      id: as.artist.id,
      name: as.artist.name,
      nameKo: as.artist.nameKo,
      role: as.role ?? null,
      order: as.order,
    })),
  };
}

// ========== 곡 편집용 미연결 데이터 조회 ==========

// 아티스트의 미연결 스포티파이 그룹 조회
export type UnlinkedSpotifyGroup = {
  groupId: number;
  primaryTrack: {
    name: string;
    spotifyId: string;
    popularity: number | null;
    thumbnails: string[];
  } | null;
};

export async function fetchUnlinkedSpotifyGroups(
  artistId: number,
): Promise<UnlinkedSpotifyGroup[]> {
  if (!artistId || Number.isNaN(artistId)) {
    return [];
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { spotifyId: true },
  });

  if (!artist?.spotifyId) {
    return [];
  }

  // 아티스트의 모든 스포티파이 트랙 그룹 가져오기
  const artistTracks = await prisma.spotifyArtistTrack.findMany({
    where: { spotifyArtist: { spotifyId: artist.spotifyId } },
    select: {
      spotifyTrack: {
        select: {
          groupId: true,
          group: {
            select: {
              id: true,
              primaryTrack: {
                select: {
                  name: true,
                  spotifyId: true,
                  popularity: true,
                  thumbnails: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 이미 Song에 연결된 그룹 ID들 가져오기
  const linkedGroupIds = await prisma.song.findMany({
    where: {
      spotifyTrackGroupId: { not: null },
      artistSongs: { some: { artistId } },
    },
    select: { spotifyTrackGroupId: true },
  });
  const linkedSet = new Set(linkedGroupIds.map((s) => s.spotifyTrackGroupId));

  // 미연결 그룹 필터링
  const groupMap = new Map<number, UnlinkedSpotifyGroup>();
  for (const record of artistTracks) {
    const group = record.spotifyTrack?.group;
    if (!group || linkedSet.has(group.id) || groupMap.has(group.id)) {
      continue;
    }
    groupMap.set(group.id, {
      groupId: group.id,
      primaryTrack: group.primaryTrack
        ? {
            name: group.primaryTrack.name,
            spotifyId: group.primaryTrack.spotifyId,
            popularity: group.primaryTrack.popularity,
            thumbnails: group.primaryTrack.thumbnails,
          }
        : null,
    });
  }

  return Array.from(groupMap.values()).sort((a, b) => {
    const popA = a.primaryTrack?.popularity ?? -1;
    const popB = b.primaryTrack?.popularity ?? -1;
    return popB - popA;
  });
}

// 아티스트의 미연결 유튜브 비디오 조회
export type UnlinkedYoutubeVideo = {
  videoId: string;
  title: string | null;
  viewCount: string | null;
  thumbnailMedium: string | null;
};

export async function fetchUnlinkedYoutubeVideos(
  artistId: number,
): Promise<UnlinkedYoutubeVideo[]> {
  if (!artistId || Number.isNaN(artistId)) {
    return [];
  }

  // 아티스트의 TOPIC 채널 가져오기
  const topicChannel = await prisma.youtubeChannel.findFirst({
    where: { artistId, type: "TOPIC" },
    select: { id: true },
  });

  if (!topicChannel) {
    return [];
  }

  // 채널의 모든 비디오 가져오기
  const channelVideos = await prisma.youtubeChannelVideo.findMany({
    where: { youtubeChannelId: topicChannel.id },
    select: {
      youtubeVideo: {
        select: {
          videoId: true,
          title: true,
          viewCount: true,
          thumbnailMedium: true,
        },
      },
    },
  });

  // 이미 Song에 연결된 비디오 ID들 가져오기
  const linkedVideoIds = await prisma.songYoutubeVideo.findMany({
    where: {
      song: { artistSongs: { some: { artistId } } },
    },
    select: { youtubeVideoId: true },
  });
  const linkedSet = new Set(linkedVideoIds.map((v) => v.youtubeVideoId));

  // 미연결 비디오 필터링
  return channelVideos
    .filter((cv) => !linkedSet.has(cv.youtubeVideo.videoId))
    .map((cv) => ({
      videoId: cv.youtubeVideo.videoId,
      title: cv.youtubeVideo.title,
      viewCount: cv.youtubeVideo.viewCount?.toString() ?? null,
      thumbnailMedium: cv.youtubeVideo.thumbnailMedium,
    }))
    .sort((a, b) => {
      const viewA = Number(a.viewCount ?? 0);
      const viewB = Number(b.viewCount ?? 0);
      return viewB - viewA;
    });
}

// 아티스트의 미연결 신청곡 조회
export type UnlinkedSongPropose = {
  id: number;
  songTitle: string;
  songSinger: string;
  hit: number;
  regdateView: string;
};

export async function fetchUnlinkedSongProposes(
  artistId: number,
): Promise<UnlinkedSongPropose[]> {
  if (!artistId || Number.isNaN(artistId)) {
    return [];
  }

  // 아티스트의 tjName, tjNameJa 가져오기
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { tjName: true, tjNameJa: true },
  });

  if (!artist?.tjName && !artist?.tjNameJa) {
    return [];
  }

  const singerNames: string[] = [];
  if (artist.tjName) singerNames.push(artist.tjName);
  if (artist.tjNameJa) singerNames.push(artist.tjNameJa);

  // 해당 가수의 미연결 신청곡 조회
  const proposes = await prisma.songPropose.findMany({
    where: {
      songSinger: { in: singerNames },
      songId: null, // 미연결만
    },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
      hit: true,
      regdateView: true,
    },
    orderBy: { hit: "desc" },
  });

  return proposes;
}

// 곡에 연결된 유튜브 비디오 조회
export type LinkedYoutubeVideo = {
  videoId: string;
  title: string | null;
  viewCount: string | null;
  thumbnailMedium: string | null;
};

export async function fetchLinkedYoutubeVideos(
  songId: number,
): Promise<LinkedYoutubeVideo[]> {
  if (!songId || Number.isNaN(songId)) {
    return [];
  }

  const links = await prisma.songYoutubeVideo.findMany({
    where: { songId },
    select: {
      youtubeVideo: {
        select: {
          videoId: true,
          title: true,
          viewCount: true,
          thumbnailMedium: true,
        },
      },
    },
  });

  return links.map((l) => ({
    videoId: l.youtubeVideo.videoId,
    title: l.youtubeVideo.title,
    viewCount: l.youtubeVideo.viewCount?.toString() ?? null,
    thumbnailMedium: l.youtubeVideo.thumbnailMedium,
  }));
}

// 곡에 연결된 신청곡 조회
export type LinkedSongPropose = {
  id: number;
  songTitle: string;
  songSinger: string;
  hit: number;
  regdateView: string;
};

export async function fetchLinkedSongProposes(
  songId: number,
): Promise<LinkedSongPropose[]> {
  if (!songId || Number.isNaN(songId)) {
    return [];
  }

  const proposes = await prisma.songPropose.findMany({
    where: { songId },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
      hit: true,
      regdateView: true,
    },
    orderBy: { hit: "desc" },
  });

  return proposes;
}

// ========== 연결/해제 함수들 ==========

// 스포티파이 그룹 연결
export async function linkSpotifyGroup(songId: number, groupId: number) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!groupId || Number.isNaN(groupId)) {
    throw new Error("유효한 그룹 ID가 필요합니다.");
  }

  await prisma.song.update({
    where: { id: songId },
    data: { spotifyTrackGroupId: groupId },
  });

  return { success: true };
}

// 스포티파이 그룹 연결 해제
export async function unlinkSpotifyGroup(songId: number) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  await prisma.song.update({
    where: { id: songId },
    data: { spotifyTrackGroupId: null },
  });

  return { success: true };
}

// 유튜브 비디오 연결
export async function linkYoutubeVideo(songId: number, videoId: string) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!videoId) {
    throw new Error("유효한 비디오 ID가 필요합니다.");
  }

  // 이미 연결되어 있는지 확인
  const existing = await prisma.songYoutubeVideo.findFirst({
    where: { songId, youtubeVideoId: videoId },
  });

  if (existing) {
    throw new Error("이미 연결된 비디오입니다.");
  }

  await prisma.songYoutubeVideo.create({
    data: { songId, youtubeVideoId: videoId },
  });

  return { success: true };
}

// 유튜브 비디오 연결 해제
export async function unlinkYoutubeVideo(songId: number, videoId: string) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!videoId) {
    throw new Error("유효한 비디오 ID가 필요합니다.");
  }

  await prisma.songYoutubeVideo.deleteMany({
    where: { songId, youtubeVideoId: videoId },
  });

  return { success: true };
}

// 신청곡 연결
export async function linkSongPropose(songId: number, proposeId: number) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!proposeId || Number.isNaN(proposeId)) {
    throw new Error("유효한 신청곡 ID가 필요합니다.");
  }

  await prisma.songPropose.update({
    where: { id: proposeId },
    data: { songId },
  });

  return { success: true };
}

// 신청곡 연결 해제
export async function unlinkSongPropose(proposeId: number) {
  if (!proposeId || Number.isNaN(proposeId)) {
    throw new Error("유효한 신청곡 ID가 필요합니다.");
  }

  await prisma.songPropose.update({
    where: { id: proposeId },
    data: { songId: null },
  });

  return { success: true };
}

// ========== 스포티파이 트랙 그룹 나가기 ==========

export async function leaveSpotifyTrackGroup(trackId: number) {
  if (!trackId || Number.isNaN(trackId)) {
    throw new Error("유효한 트랙 ID가 필요합니다.");
  }

  await prisma.spotifyTrack.update({
    where: { id: trackId },
    data: { groupId: null },
  });

  return { success: true };
}

// ========== 썸네일 새로고침 ==========

export type RefreshThumbnailResult = {
  source: "spotify" | "youtube" | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
};

// 썸네일 새로고침 (스포티파이: 가장 오래된 발매일, 유튜브: 가장 높은 조회수)
export async function refreshSongThumbnail(
  songId: number,
  source: "spotify" | "youtube",
): Promise<RefreshThumbnailResult> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      spotifyTrackGroupId: true,
      youtubeVideos: {
        select: {
          youtubeVideo: {
            select: {
              videoId: true,
              viewCount: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
            },
          },
        },
      },
    },
  });

  if (!song) {
    throw new Error("곡을 찾을 수 없습니다.");
  }

  let thumbnailDefault: string | null = null;
  let thumbnailMedium: string | null = null;
  let thumbnailHigh: string | null = null;
  let actualSource: "spotify" | "youtube" | null = null;

  if (source === "spotify" && song.spotifyTrackGroupId) {
    // 스포티파이 그룹에서 가장 오래된 발매일의 트랙 썸네일 가져오기
    const oldestTrack = await prisma.spotifyTrack.findFirst({
      where: { groupId: song.spotifyTrackGroupId },
      orderBy: { releaseDate: "asc" },
      select: { thumbnails: true },
    });

    if (oldestTrack?.thumbnails?.length) {
      // Spotify 썸네일은 배열로 저장됨 (보통 3개: 640, 300, 64)
      const thumbs = oldestTrack.thumbnails;
      thumbnailHigh = thumbs[0] ?? null;
      thumbnailMedium = thumbs[1] ?? thumbs[0] ?? null;
      thumbnailDefault = thumbs[2] ?? thumbs[1] ?? thumbs[0] ?? null;
      actualSource = "spotify";
    }
  } else if (source === "youtube" && song.youtubeVideos.length > 0) {
    // 유튜브 비디오 중 가장 조회수가 높은 것의 썸네일
    const sortedVideos = [...song.youtubeVideos].sort((a, b) => {
      const viewA = Number(a.youtubeVideo.viewCount ?? 0);
      const viewB = Number(b.youtubeVideo.viewCount ?? 0);
      return viewB - viewA;
    });

    const topVideo = sortedVideos[0]?.youtubeVideo;
    if (topVideo) {
      thumbnailDefault = topVideo.thumbnailDefault;
      thumbnailMedium = topVideo.thumbnailMedium;
      thumbnailHigh = topVideo.thumbnailHigh;
      actualSource = "youtube";
    }
  }

  if (!actualSource) {
    throw new Error(`${source === "spotify" ? "스포티파이" : "유튜브"} 썸네일을 찾을 수 없습니다.`);
  }

  // 썸네일 업데이트
  await prisma.song.update({
    where: { id: songId },
    data: {
      thumbnailDefault,
      thumbnailMedium,
      thumbnailHigh,
    },
  });

  return {
    source: actualSource,
    thumbnailDefault,
    thumbnailMedium,
    thumbnailHigh,
  };
}
