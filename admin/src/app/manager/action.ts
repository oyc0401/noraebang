"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { ArtistFilterId } from "./filter-options";
import {
  MANAGER_PAGE_SIZE,
  type ManagerArtistDetail,
  type ManagerArtistSummary,
  type ManagerSpotifyPanelData,
  type ManagerSpotifyTrackSummary,
  type ManagerSortKey,
  type ManagerYoutubePanelData,
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

  const precedingWhere = buildPrecedingWhereClause(
    where,
    sortKey,
    target,
  );
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

function mapArtistRecord(artist: Prisma.ArtistGetPayload<{ select: typeof artistSelect }>): ManagerArtistSummary {
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
  const normalizedBase =
    base && Object.keys(base).length > 0 ? [base] : [];
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

  const songs = artist.artistSongs.map(({ song }) => ({
    id: song.id,
    title: song.title,
    titleKo: song.titleKo,
    titleLatin: song.titleLatin,
    catalog: song.catalog,
    hasYoutube: Boolean(song.youtubeVideoId),
    youtubeVideoId: song.youtubeVideoId,
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
  }));

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
    slug: slug?.trim() ? slug.trim() : null,
    homeCatalog:
      catalog && catalog !== "미정" ? catalog : catalog === "미정" ? null : undefined,
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

export async function fetchManagerArtistYoutubePanel(
  artistId: number,
): Promise<ManagerYoutubePanelData> {
  if (!artistId || Number.isNaN(artistId)) {
    return { channel: null, videos: [] };
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
    return { channel: null, videos: [] };
  }

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

  return {
    channel: {
      id: topicChannel.id,
      channelId: topicChannel.channelId,
      title: topicChannel.title,
      thumbnailMedium: topicChannel.thumbnailMedium,
      subscriberCount: topicChannel.subscriberCount,
      videoCount: topicChannel.videoCount,
    },
    videos: channelVideos.map((v) => ({
      videoId: v.youtubeVideo.videoId,
      title: v.youtubeVideo.title,
      publishedAt: v.youtubeVideo.publishedAt?.toISOString() ?? null,
      thumbnailMedium: v.youtubeVideo.thumbnailMedium,
      thumbnailHigh: v.youtubeVideo.thumbnailHigh,
      viewCount: v.youtubeVideo.viewCount?.toString() ?? null,
      likeCount: v.youtubeVideo.likeCount,
      durationSeconds: v.youtubeVideo.durationSeconds,
    })),
  };
}
