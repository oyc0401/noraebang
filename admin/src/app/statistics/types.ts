export type DateRange = "today" | "7days" | "30days" | "all";

export type StatisticsFilter = {
  dateRange: DateRange;
  customStartDate?: string;
  customEndDate?: string;
};

export type OverviewStats = {
  totalSearches: number;
  totalClicks: number;
  uniqueUsers: number;
  conversionRate: number; // clicks / searches * 100
  searchesTrend: number; // 이전 기간 대비 %
  clicksTrend: number;
};

export type PopularSearch = {
  query: string;
  count: number;
  clickCount: number;
  conversionRate: number;
};

export type PopularArtistClick = {
  artistId: number;
  artistName: string;
  artistNameKo: string;
  clickCount: number;
  queries: string[]; // 이 아티스트로 이어진 검색어들
};

export type PopularSongClick = {
  songId: number;
  songTitle: string;
  songTitleKo?: string;
  artistName: string;
  clickCount: number;
  queries: string[];
};

export type DailyStats = {
  date: string;
  searches: number;
  clicks: number;
};

export type SearchHistoryItem = {
  id: number;
  userId: number;
  query?: string;
  url?: string;
  searchedAt: string;
};

export type SearchClickItem = {
  id: number;
  userId: number;
  query?: string;
  url?: string;
  artistId?: number;
  artistName?: string;
  songId?: number;
  songTitle?: string;
  clickedAt: string;
};

export const DATE_RANGE_OPTIONS: Array<{ value: DateRange; label: string }> = [
  { value: "today", label: "오늘" },
  { value: "7days", label: "최근 7일" },
  { value: "30days", label: "최근 30일" },
  { value: "all", label: "전체" },
];
