"use server";

import { prisma } from "@/lib/prisma";
import type {
  StatisticsFilter,
  OverviewStats,
  PopularSearch,
  PopularArtistClick,
  PopularSongClick,
  DailyStats,
  SearchHistoryItem,
  SearchClickItem,
} from "./types";

function getDateRange(filter: StatisticsFilter): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (filter.dateRange) {
    case "today":
      start = new Date();
      start.setHours(0, 0, 0, 0);
      break;
    case "7days":
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "30days":
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "all":
      start = new Date("2020-01-01");
      break;
    default:
      start = new Date();
      start.setHours(0, 0, 0, 0);
  }

  if (filter.customStartDate) {
    start = new Date(filter.customStartDate);
    start.setHours(0, 0, 0, 0);
  }
  if (filter.customEndDate) {
    end.setTime(new Date(filter.customEndDate).getTime());
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function getPreviousDateRange(filter: StatisticsFilter): {
  start: Date;
  end: Date;
} {
  const current = getDateRange(filter);
  const duration = current.end.getTime() - current.start.getTime();

  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.start.getTime() - 1),
  };
}

export async function fetchOverviewStats(
  filter: StatisticsFilter
): Promise<OverviewStats> {
  const { start, end } = getDateRange(filter);
  const prev = getPreviousDateRange(filter);

  // 현재 기간 통계
  const [searchCount, clickCount, uniqueSearchUsers, uniqueClickUsers] =
    await Promise.all([
      prisma.searchHistory.count({
        where: { searchedAt: { gte: start, lte: end } },
      }),
      prisma.searchClick.count({
        where: { clickedAt: { gte: start, lte: end } },
      }),
      prisma.searchHistory.groupBy({
        by: ["userId"],
        where: { searchedAt: { gte: start, lte: end } },
      }),
      prisma.searchClick.groupBy({
        by: ["userId"],
        where: { clickedAt: { gte: start, lte: end } },
      }),
    ]);

  // 이전 기간 통계 (트렌드 계산용)
  const [prevSearchCount, prevClickCount] = await Promise.all([
    prisma.searchHistory.count({
      where: { searchedAt: { gte: prev.start, lte: prev.end } },
    }),
    prisma.searchClick.count({
      where: { clickedAt: { gte: prev.start, lte: prev.end } },
    }),
  ]);

  const uniqueUserIds = new Set([
    ...uniqueSearchUsers.map((u) => u.userId),
    ...uniqueClickUsers.map((u) => u.userId),
  ]);

  const conversionRate =
    searchCount > 0 ? Math.round((clickCount / searchCount) * 100) : 0;

  const searchesTrend =
    prevSearchCount > 0
      ? Math.round(((searchCount - prevSearchCount) / prevSearchCount) * 100)
      : 0;

  const clicksTrend =
    prevClickCount > 0
      ? Math.round(((clickCount - prevClickCount) / prevClickCount) * 100)
      : 0;

  return {
    totalSearches: searchCount,
    totalClicks: clickCount,
    uniqueUsers: uniqueUserIds.size,
    conversionRate,
    searchesTrend,
    clicksTrend,
  };
}

export async function fetchPopularSearches(
  filter: StatisticsFilter,
  limit: number = 20
): Promise<PopularSearch[]> {
  const { start, end } = getDateRange(filter);

  // 검색어별 검색 횟수
  const searchCounts = await prisma.searchHistory.groupBy({
    by: ["query"],
    where: {
      searchedAt: { gte: start, lte: end },
      query: { not: null },
    },
    _count: { query: true },
    orderBy: { _count: { query: "desc" } },
    take: limit,
  });

  // 각 검색어별 클릭 횟수
  const queries = searchCounts
    .map((s) => s.query)
    .filter((q): q is string => q !== null);

  const clickCounts = await prisma.searchClick.groupBy({
    by: ["query"],
    where: {
      clickedAt: { gte: start, lte: end },
      query: { in: queries },
    },
    _count: { query: true },
  });

  const clickMap = new Map(clickCounts.map((c) => [c.query, c._count.query]));

  return searchCounts.map((s) => {
    const query = s.query ?? "";
    const count = s._count.query;
    const clickCount = clickMap.get(query) ?? 0;
    return {
      query,
      count,
      clickCount,
      conversionRate: count > 0 ? Math.round((clickCount / count) * 100) : 0,
    };
  });
}

export async function fetchPopularArtistClicks(
  filter: StatisticsFilter,
  limit: number = 20
): Promise<PopularArtistClick[]> {
  const { start, end } = getDateRange(filter);

  const artistClicks = await prisma.searchClick.groupBy({
    by: ["artistId"],
    where: {
      clickedAt: { gte: start, lte: end },
      artistId: { not: null },
    },
    _count: { artistId: true },
    orderBy: { _count: { artistId: "desc" } },
    take: limit,
  });

  const artistIds = artistClicks
    .map((a) => a.artistId)
    .filter((id): id is number => id !== null);

  // 아티스트 정보 가져오기
  const artists = await prisma.artist.findMany({
    where: { id: { in: artistIds } },
    select: { id: true, name: true, nameKo: true },
  });

  const artistMap = new Map(artists.map((a) => [a.id, a]));

  // 각 아티스트로 이어진 검색어들
  const queriesPerArtist = await prisma.searchClick.findMany({
    where: {
      clickedAt: { gte: start, lte: end },
      artistId: { in: artistIds },
      query: { not: null },
    },
    select: { artistId: true, query: true },
    distinct: ["artistId", "query"],
  });

  const queryMap = new Map<number, string[]>();
  for (const q of queriesPerArtist) {
    if (q.artistId && q.query) {
      const existing = queryMap.get(q.artistId) ?? [];
      if (!existing.includes(q.query)) {
        existing.push(q.query);
        queryMap.set(q.artistId, existing);
      }
    }
  }

  return artistClicks
    .filter((a) => a.artistId !== null)
    .map((a) => {
      const artist = artistMap.get(a.artistId!);
      return {
        artistId: a.artistId!,
        artistName: artist?.name ?? "Unknown",
        artistNameKo: artist?.nameKo ?? "",
        clickCount: a._count.artistId,
        queries: (queryMap.get(a.artistId!) ?? []).slice(0, 5),
      };
    });
}

export async function fetchPopularSongClicks(
  filter: StatisticsFilter,
  limit: number = 20
): Promise<PopularSongClick[]> {
  const { start, end } = getDateRange(filter);

  const songClicks = await prisma.searchClick.groupBy({
    by: ["songId"],
    where: {
      clickedAt: { gte: start, lte: end },
      songId: { not: null },
    },
    _count: { songId: true },
    orderBy: { _count: { songId: "desc" } },
    take: limit,
  });

  const songIds = songClicks
    .map((s) => s.songId)
    .filter((id): id is number => id !== null);

  // 곡 정보 가져오기
  const songs = await prisma.song.findMany({
    where: { id: { in: songIds } },
    select: {
      id: true,
      title: true,
      titleKo: true,
      artistSongs: {
        select: { artist: { select: { name: true } } },
        take: 1,
      },
    },
  });

  const songMap = new Map(songs.map((s) => [s.id, s]));

  // 각 곡으로 이어진 검색어들
  const queriesPerSong = await prisma.searchClick.findMany({
    where: {
      clickedAt: { gte: start, lte: end },
      songId: { in: songIds },
      query: { not: null },
    },
    select: { songId: true, query: true },
    distinct: ["songId", "query"],
  });

  const queryMap = new Map<number, string[]>();
  for (const q of queriesPerSong) {
    if (q.songId && q.query) {
      const existing = queryMap.get(q.songId) ?? [];
      if (!existing.includes(q.query)) {
        existing.push(q.query);
        queryMap.set(q.songId, existing);
      }
    }
  }

  return songClicks
    .filter((s) => s.songId !== null)
    .map((s) => {
      const song = songMap.get(s.songId!);
      return {
        songId: s.songId!,
        songTitle: song?.title ?? "Unknown",
        songTitleKo: song?.titleKo ?? undefined,
        artistName: song?.artistSongs[0]?.artist?.name ?? "Unknown",
        clickCount: s._count.songId,
        queries: (queryMap.get(s.songId!) ?? []).slice(0, 5),
      };
    });
}

export async function fetchDailyStats(
  filter: StatisticsFilter
): Promise<DailyStats[]> {
  const { start, end } = getDateRange(filter);

  // 날짜별 검색 횟수
  const searches = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE(searched_at) as date, COUNT(*) as count
    FROM search_history
    WHERE searched_at >= ${start} AND searched_at <= ${end}
    GROUP BY DATE(searched_at)
    ORDER BY date ASC
  `;

  // 날짜별 클릭 횟수
  const clicks = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE(clicked_at) as date, COUNT(*) as count
    FROM search_click
    WHERE clicked_at >= ${start} AND clicked_at <= ${end}
    GROUP BY DATE(clicked_at)
    ORDER BY date ASC
  `;

  const searchMap = new Map(
    searches.map((s) => [s.date.toISOString().split("T")[0], Number(s.count)])
  );
  const clickMap = new Map(
    clicks.map((c) => [c.date.toISOString().split("T")[0], Number(c.count)])
  );

  // 모든 날짜 합치기
  const allDates = new Set([...searchMap.keys(), ...clickMap.keys()]);
  const sortedDates = Array.from(allDates).sort();

  return sortedDates.map((date) => ({
    date,
    searches: searchMap.get(date) ?? 0,
    clicks: clickMap.get(date) ?? 0,
  }));
}

export async function fetchRecentSearchHistory(
  filter: StatisticsFilter,
  limit: number = 50
): Promise<SearchHistoryItem[]> {
  const { start, end } = getDateRange(filter);

  const histories = await prisma.searchHistory.findMany({
    where: { searchedAt: { gte: start, lte: end } },
    select: {
      id: true,
      userId: true,
      query: true,
      url: true,
      searchedAt: true,
    },
    orderBy: { searchedAt: "desc" },
    take: limit,
  });

  return histories.map((h) => ({
    id: h.id,
    userId: h.userId,
    query: h.query ?? undefined,
    url: h.url ?? undefined,
    searchedAt: h.searchedAt.toISOString(),
  }));
}

export async function fetchRecentSearchClicks(
  filter: StatisticsFilter,
  limit: number = 50
): Promise<SearchClickItem[]> {
  const { start, end } = getDateRange(filter);

  const clicks = await prisma.searchClick.findMany({
    where: { clickedAt: { gte: start, lte: end } },
    select: {
      id: true,
      userId: true,
      query: true,
      url: true,
      artistId: true,
      artist: { select: { name: true } },
      songId: true,
      song: { select: { title: true } },
      clickedAt: true,
    },
    orderBy: { clickedAt: "desc" },
    take: limit,
  });

  return clicks.map((c) => ({
    id: c.id,
    userId: c.userId,
    query: c.query ?? undefined,
    url: c.url ?? undefined,
    artistId: c.artistId ?? undefined,
    artistName: c.artist?.name ?? undefined,
    songId: c.songId ?? undefined,
    songTitle: c.song?.title ?? undefined,
    clickedAt: c.clickedAt.toISOString(),
  }));
}

export async function deleteSearchHistory(id: number): Promise<void> {
  await prisma.searchHistory.delete({ where: { id } });
}

export async function deleteSearchClick(id: number): Promise<void> {
  await prisma.searchClick.delete({ where: { id } });
}

export async function bulkDeleteSearchHistory(ids: number[]): Promise<number> {
  const result = await prisma.searchHistory.deleteMany({
    where: { id: { in: ids } },
  });
  return result.count;
}

export async function bulkDeleteSearchClicks(ids: number[]): Promise<number> {
  const result = await prisma.searchClick.deleteMany({
    where: { id: { in: ids } },
  });
  return result.count;
}

// 특정 검색어 관련 데이터 모두 삭제
export async function deleteByQuery(query: string): Promise<{
  historyCount: number;
  clickCount: number;
}> {
  const [historyResult, clickResult] = await Promise.all([
    prisma.searchHistory.deleteMany({ where: { query } }),
    prisma.searchClick.deleteMany({ where: { query } }),
  ]);

  return {
    historyCount: historyResult.count,
    clickCount: clickResult.count,
  };
}
