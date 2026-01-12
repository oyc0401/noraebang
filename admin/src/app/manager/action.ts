"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { ArtistFilterId } from "./filter-options";
import {
  MANAGER_PAGE_SIZE,
  type ManagerArtistDetail,
  type ManagerArtistSummary,
  type ManagerSortKey,
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
    catalog: artist.homeCatalog,
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
      homeCatalog: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      spotifyArtist: {
        select: {
          popularity: true,
          followers: true,
          genres: true,
          spotifyUrl: true,
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
              catalog: true,
              youtubeVideoId: true,
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
    catalog: song.catalog,
    hasYoutube: Boolean(song.youtubeVideoId),
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
    catalog: artist.homeCatalog,
    songCount: artist._count.artistSongs,
    thumbnails: {
      default: artist.thumbnailDefault,
      medium: artist.thumbnailMedium,
      high: artist.thumbnailHigh,
    },
    spotify: artist.spotifyArtist
      ? {
          popularity: artist.spotifyArtist.popularity,
          followers: artist.spotifyArtist.followers,
          genres: artist.spotifyArtist.genres ?? [],
          url: artist.spotifyArtist.spotifyUrl,
        }
      : null,
    songs,
  };
}
