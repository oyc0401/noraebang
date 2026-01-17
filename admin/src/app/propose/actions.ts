"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { PROPOSE_DEFAULT_PAGE_SIZE } from "./constants";

const DEFAULT_PAGE_SIZE = PROPOSE_DEFAULT_PAGE_SIZE;
const MAX_PAGE_SIZE = 200;

export type TjProposeSortKey = "recent" | "oldest" | "hitDesc" | "hitAsc";
export type TjProposeLinkFilter = "all" | "linked" | "unlinked";

export type FetchTjProposeParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  sortKey?: TjProposeSortKey;
  linkFilter?: TjProposeLinkFilter;
};

export type TjProposeListItem = {
  id: number;
  songTitle: string;
  songSinger: string;
  hit: number;
  regdateView: string;
  otCode: string;
  content: string;
  requesterName: string;
  requesterEmail: string;
  saveDateMs: number;
  updateDateMs: number;
  songId: number | null;
  linkedSong: { id: number; title: string; titleKo?: string | null } | null;
};

export type FetchTjProposeResult = {
  items: TjProposeListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
};

const sortOrderMap: Record<
  TjProposeSortKey,
  Prisma.SongProposeOrderByWithRelationInput[]
> = {
  recent: [{ saveDate: "desc" }, { id: "desc" }],
  oldest: [{ saveDate: "asc" }, { id: "asc" }],
  hitDesc: [{ hit: "desc" }, { id: "desc" }],
  hitAsc: [{ hit: "asc" }, { id: "asc" }],
};

export async function fetchTjProposes(
  params: FetchTjProposeParams = {},
): Promise<FetchTjProposeResult> {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = clampPageSize(params.pageSize ?? DEFAULT_PAGE_SIZE);
  const skip = (page - 1) * pageSize;
  const sortKey = params.sortKey ?? "recent";
  const where = buildWhereClause(params);

  const [totalCount, entries] = await Promise.all([
    prisma.songPropose.count({ where }),
    prisma.songPropose.findMany({
      where,
      orderBy: sortOrderMap[sortKey],
      skip,
      take: pageSize,
      select: {
        id: true,
        songTitle: true,
        songSinger: true,
        hit: true,
        regdateView: true,
        otCode: true,
        content: true,
        name: true,
        email1: true,
        email2: true,
        saveDate: true,
        updateDate: true,
        songId: true,
        song: {
          select: {
            id: true,
            title: true,
            titleKo: true,
          },
        },
      },
    }),
  ]);

  const items: TjProposeListItem[] = entries.map((entry) => ({
    id: entry.id,
    songTitle: entry.songTitle,
    songSinger: entry.songSinger,
    hit: entry.hit,
    regdateView: entry.regdateView,
    otCode: entry.otCode,
    content: entry.content,
    requesterName: entry.name,
    requesterEmail: buildEmail(entry.email1, entry.email2),
    saveDateMs: Number(entry.saveDate),
    updateDateMs: Number(entry.updateDate),
    songId: entry.songId,
    linkedSong: entry.song
      ? {
          id: entry.song.id,
          title: entry.song.title,
          titleKo: entry.song.titleKo ?? undefined,
        }
      : null,
  }));

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const hasMore = page * pageSize < totalCount;

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasMore,
  };
}

function clampPageSize(size: number) {
  if (Number.isNaN(size) || size <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(size, MAX_PAGE_SIZE);
}

function buildWhereClause(
  params: FetchTjProposeParams,
): Prisma.SongProposeWhereInput {
  const where: Prisma.SongProposeWhereInput = {};

  if (params.query?.trim()) {
    const query = params.query.trim();
    where.OR = [
      { songTitle: { contains: query, mode: "insensitive" } },
      { songSinger: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
      { otCode: { contains: query, mode: "insensitive" } },
    ];
  }

  switch (params.linkFilter) {
    case "linked":
      where.songId = { not: null };
      break;
    case "unlinked":
      where.songId = null;
      break;
    default:
      break;
  }

  return where;
}

function buildEmail(email1: string, email2: string) {
  if (!email1 && !email2) return "";
  if (!email1) return email2;
  if (!email2) return email1;
  return `${email1}@${email2}`;
}
