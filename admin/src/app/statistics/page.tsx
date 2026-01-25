"use client";

import { useEffect, useState } from "react";
import {
  Search,
  MousePointerClick,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  ChevronRight,
  Music,
  User,
  Clock,
  Link,
  BarChart3,
  History,
  Target,
  ArrowUpRight,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";

import { useStatisticsStore } from "./store";
import {
  fetchOverviewStats,
  fetchPopularSearches,
  fetchPopularArtistClicks,
  fetchPopularSongClicks,
  fetchDailyStats,
  fetchRecentSearchHistory,
  fetchRecentSearchClicks,
  deleteSearchHistory,
  deleteSearchClick,
  bulkDeleteSearchHistory,
  bulkDeleteSearchClicks,
  deleteByQuery,
} from "./action";
import {
  type OverviewStats,
  type PopularSearch,
  type PopularArtistClick,
  type PopularSongClick,
  type DailyStats,
  type SearchHistoryItem,
  type SearchClickItem,
  type DateRange,
  DATE_RANGE_OPTIONS,
} from "./types";

export default function StatisticsPage() {
  const { filter, setDateRange, activeTab, setActiveTab } =
    useStatisticsStore();

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [popularArtists, setPopularArtists] = useState<PopularArtistClick[]>(
    []
  );
  const [popularSongs, setPopularSongs] = useState<PopularSongClick[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [recentHistory, setRecentHistory] = useState<SearchHistoryItem[]>([]);
  const [recentClicks, setRecentClicks] = useState<SearchClickItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        overviewData,
        searchesData,
        artistsData,
        songsData,
        dailyData,
        historyData,
        clicksData,
      ] = await Promise.all([
        fetchOverviewStats(filter),
        fetchPopularSearches(filter),
        fetchPopularArtistClicks(filter),
        fetchPopularSongClicks(filter),
        fetchDailyStats(filter),
        fetchRecentSearchHistory(filter),
        fetchRecentSearchClicks(filter),
      ]);

      setOverview(overviewData);
      setPopularSearches(searchesData);
      setPopularArtists(artistsData);
      setPopularSongs(songsData);
      setDailyStats(dailyData);
      setRecentHistory(historyData);
      setRecentClicks(clicksData);
    } catch (error) {
      console.error("Failed to load statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">검색 통계</h1>
            <p className="text-zinc-500 text-sm mt-1">
              SearchHistory & SearchClick 데이터 분석
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 기간 선택 */}
            <div className="flex bg-white rounded-lg border border-zinc-200 p-1">
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDateRange(option.value)}
                  className={`px-3 py-1.5 text-sm rounded cursor-pointer transition-colors ${
                    filter.dateRange === option.value
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 hover:bg-white rounded-lg border border-zinc-200 cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg border border-zinc-200 p-1 w-fit">
          {[
            { id: "overview", label: "개요", icon: BarChart3 },
            { id: "searches", label: "검색어 분석", icon: Search },
            { id: "clicks", label: "클릭 분석", icon: MousePointerClick },
            { id: "history", label: "기록 관리", icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === "overview" && (
          <OverviewTab
            overview={overview}
            dailyStats={dailyStats}
            popularSearches={popularSearches.slice(0, 10)}
            popularArtists={popularArtists.slice(0, 10)}
            popularSongs={popularSongs.slice(0, 10)}
            loading={loading}
          />
        )}
        {activeTab === "searches" && (
          <SearchesTab
            popularSearches={popularSearches}
            onDeleteQuery={async (query) => {
              await deleteByQuery(query);
              handleRefresh();
            }}
          />
        )}
        {activeTab === "clicks" && (
          <ClicksTab
            popularArtists={popularArtists}
            popularSongs={popularSongs}
          />
        )}
        {activeTab === "history" && (
          <HistoryTab
            recentHistory={recentHistory}
            recentClicks={recentClicks}
            onDeleteHistory={async (id) => {
              await deleteSearchHistory(id);
              handleRefresh();
            }}
            onDeleteClick={async (id) => {
              await deleteSearchClick(id);
              handleRefresh();
            }}
            onBulkDeleteHistory={async (ids) => {
              await bulkDeleteSearchHistory(ids);
              handleRefresh();
            }}
            onBulkDeleteClicks={async (ids) => {
              await bulkDeleteSearchClicks(ids);
              handleRefresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ==================== 개요 탭 ====================
function OverviewTab({
  overview,
  dailyStats,
  popularSearches,
  popularArtists,
  popularSongs,
  loading,
}: {
  overview: OverviewStats | null;
  dailyStats: DailyStats[];
  popularSearches: PopularSearch[];
  popularArtists: PopularArtistClick[];
  popularSongs: PopularSongClick[];
  loading: boolean;
}) {
  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="총 검색 수"
          value={overview.totalSearches.toLocaleString()}
          icon={Search}
          trend={overview.searchesTrend}
          color="blue"
        />
        <StatCard
          title="총 클릭 수"
          value={overview.totalClicks.toLocaleString()}
          icon={MousePointerClick}
          trend={overview.clicksTrend}
          color="green"
        />
        <StatCard
          title="전환율"
          value={`${overview.conversionRate}%`}
          icon={Target}
          subtitle="검색 → 클릭"
          color="purple"
        />
        <StatCard
          title="활성 사용자"
          value={overview.uniqueUsers.toLocaleString()}
          icon={Users}
          subtitle="검색/클릭 기준"
          color="orange"
        />
      </div>

      {/* 일별 추이 차트 */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="text-lg font-semibold mb-4">일별 추이</h3>
        <DailyChart data={dailyStats} />
      </div>

      {/* 3열 그리드: 인기 검색어, 아티스트, 곡 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            인기 검색어 TOP 10
          </h3>
          <div className="space-y-2">
            {popularSearches.map((item, idx) => (
              <div
                key={item.query}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-zinc-400">{idx + 1}</span>
                  <span className="font-medium truncate max-w-[150px]">
                    {item.query}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <span>{item.count}회</span>
                  <span className="text-xs text-green-600">
                    {item.conversionRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            인기 아티스트 TOP 10
          </h3>
          <div className="space-y-2">
            {popularArtists.map((item, idx) => (
              <div
                key={item.artistId}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-zinc-400">{idx + 1}</span>
                  <span className="font-medium truncate max-w-[150px]">
                    {item.artistNameKo || item.artistName}
                  </span>
                </div>
                <span className="text-zinc-500">{item.clickCount}클릭</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Music className="w-4 h-4" />
            인기 곡 TOP 10
          </h3>
          <div className="space-y-2">
            {popularSongs.map((item, idx) => (
              <div
                key={item.songId}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-zinc-400 shrink-0">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {item.songTitleKo || item.songTitle}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {item.artistName}
                    </p>
                  </div>
                </div>
                <span className="text-zinc-500 shrink-0">{item.clickCount}클릭</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  trend?: number;
  subtitle?: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-zinc-500 mt-1">{subtitle ?? title}</p>
    </div>
  );
}

function DailyChart({ data }: { data: DailyStats[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-400">
        데이터가 없습니다
      </div>
    );
  }

  const maxValue = Math.max(...data.flatMap((d) => [d.searches, d.clicks]), 1);

  return (
    <div className="space-y-4">
      {/* 범례 */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>검색</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>클릭</span>
        </div>
      </div>

      {/* 차트 */}
      <div className="h-48 flex items-end gap-1">
        {data.slice(-30).map((day, idx) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end h-40">
              <div
                className="flex-1 bg-blue-500 rounded-t transition-all"
                style={{ height: `${(day.searches / maxValue) * 100}%` }}
                title={`${day.date}: ${day.searches}회 검색`}
              />
              <div
                className="flex-1 bg-green-500 rounded-t transition-all"
                style={{ height: `${(day.clicks / maxValue) * 100}%` }}
                title={`${day.date}: ${day.clicks}회 클릭`}
              />
            </div>
            {idx % Math.ceil(data.slice(-30).length / 7) === 0 && (
              <span className="text-xs text-zinc-400">
                {new Date(day.date).getDate()}일
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 검색어 분석 탭 ====================
function SearchesTab({
  popularSearches,
  onDeleteQuery,
}: {
  popularSearches: PopularSearch[];
  onDeleteQuery: (query: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (query: string) => {
    if (!confirm(`"${query}" 관련 모든 검색/클릭 기록을 삭제하시겠습니까?`)) {
      return;
    }
    setDeleting(query);
    try {
      await onDeleteQuery(query);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="p-4 border-b border-zinc-200">
        <h3 className="font-semibold">인기 검색어 상세</h3>
        <p className="text-sm text-zinc-500 mt-1">
          검색어별 검색 횟수, 클릭 횟수, 전환율을 확인하고 관리합니다
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                순위
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                검색어
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-zinc-600">
                검색 횟수
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-zinc-600">
                클릭 횟수
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-zinc-600">
                전환율
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-zinc-600">
                작업
              </th>
            </tr>
          </thead>
          <tbody>
            {popularSearches.map((item, idx) => (
              <tr
                key={item.query}
                className="border-b border-zinc-100 hover:bg-zinc-50"
              >
                <td className="px-4 py-3 text-sm text-zinc-400">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-zinc-400" />
                    <span className="font-medium">{item.query}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {item.count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {item.clickCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${
                      item.conversionRate >= 50
                        ? "bg-green-100 text-green-700"
                        : item.conversionRate >= 20
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.conversionRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.query)}
                    disabled={deleting === item.query}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded cursor-pointer disabled:opacity-50"
                    title="이 검색어 관련 모든 기록 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {popularSearches.length === 0 && (
        <div className="p-8 text-center text-zinc-400">
          검색 기록이 없습니다
        </div>
      )}
    </div>
  );
}

// ==================== 클릭 분석 탭 ====================
function ClicksTab({
  popularArtists,
  popularSongs,
}: {
  popularArtists: PopularArtistClick[];
  popularSongs: PopularSongClick[];
}) {
  const [view, setView] = useState<"artists" | "songs">("artists");

  return (
    <div className="space-y-4">
      {/* 뷰 전환 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView("artists")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
            view === "artists"
              ? "bg-zinc-900 text-white"
              : "bg-white border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <User className="w-4 h-4" />
          아티스트별 클릭
        </button>
        <button
          type="button"
          onClick={() => setView("songs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
            view === "songs"
              ? "bg-zinc-900 text-white"
              : "bg-white border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <Music className="w-4 h-4" />
          곡별 클릭
        </button>
      </div>

      {view === "artists" && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="p-4 border-b border-zinc-200">
            <h3 className="font-semibold">아티스트별 클릭 현황</h3>
            <p className="text-sm text-zinc-500 mt-1">
              가장 많이 클릭된 아티스트와 해당 검색어를 확인합니다
            </p>
          </div>
          <div className="divide-y divide-zinc-100">
            {popularArtists.map((artist, idx) => (
              <div key={artist.artistId} className="p-4 hover:bg-zinc-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded-full text-sm font-medium">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium">
                        {artist.artistNameKo || artist.artistName}
                        {artist.artistNameKo && (
                          <span className="text-zinc-400 ml-2 text-sm">
                            {artist.artistName}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-zinc-500 mt-1">
                        ID: {artist.artistId}
                      </p>
                      {artist.queries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {artist.queries.map((q) => (
                            <span
                              key={q}
                              className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded"
                            >
                              {q}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{artist.clickCount}</p>
                    <p className="text-sm text-zinc-500">클릭</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {popularArtists.length === 0 && (
            <div className="p-8 text-center text-zinc-400">
              클릭 기록이 없습니다
            </div>
          )}
        </div>
      )}

      {view === "songs" && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="p-4 border-b border-zinc-200">
            <h3 className="font-semibold">곡별 클릭 현황</h3>
            <p className="text-sm text-zinc-500 mt-1">
              가장 많이 클릭된 곡과 해당 검색어를 확인합니다
            </p>
          </div>
          <div className="divide-y divide-zinc-100">
            {popularSongs.map((song, idx) => (
              <div key={song.songId} className="p-4 hover:bg-zinc-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-zinc-100 rounded-full text-sm font-medium">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium">
                        {song.songTitleKo || song.songTitle}
                        {song.songTitleKo && (
                          <span className="text-zinc-400 ml-2 text-sm">
                            {song.songTitle}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-zinc-500 mt-1">
                        {song.artistName} · ID: {song.songId}
                      </p>
                      {song.queries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {song.queries.map((q) => (
                            <span
                              key={q}
                              className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded"
                            >
                              {q}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{song.clickCount}</p>
                    <p className="text-sm text-zinc-500">클릭</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {popularSongs.length === 0 && (
            <div className="p-8 text-center text-zinc-400">
              클릭 기록이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 기록 관리 탭 ====================
function HistoryTab({
  recentHistory,
  recentClicks,
  onDeleteHistory,
  onDeleteClick,
  onBulkDeleteHistory,
  onBulkDeleteClicks,
}: {
  recentHistory: SearchHistoryItem[];
  recentClicks: SearchClickItem[];
  onDeleteHistory: (id: number) => Promise<void>;
  onDeleteClick: (id: number) => Promise<void>;
  onBulkDeleteHistory: (ids: number[]) => Promise<void>;
  onBulkDeleteClicks: (ids: number[]) => Promise<void>;
}) {
  const {
    selectedHistoryIds,
    toggleHistoryId,
    clearHistoryIds,
    setHistoryIds,
    selectedClickIds,
    toggleClickId,
    clearClickIds,
    setClickIds,
  } = useStatisticsStore();

  const [activeSection, setActiveSection] = useState<"history" | "clicks">(
    "history"
  );
  const [deleting, setDeleting] = useState(false);

  const handleBulkDeleteHistory = async () => {
    if (selectedHistoryIds.length === 0) return;
    if (
      !confirm(`선택한 ${selectedHistoryIds.length}개의 검색 기록을 삭제하시겠습니까?`)
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onBulkDeleteHistory(selectedHistoryIds);
      clearHistoryIds();
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteClicks = async () => {
    if (selectedClickIds.length === 0) return;
    if (
      !confirm(`선택한 ${selectedClickIds.length}개의 클릭 기록을 삭제하시겠습니까?`)
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onBulkDeleteClicks(selectedClickIds);
      clearClickIds();
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* 섹션 전환 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveSection("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
            activeSection === "history"
              ? "bg-zinc-900 text-white"
              : "bg-white border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <Search className="w-4 h-4" />
          검색 기록 ({recentHistory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("clicks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
            activeSection === "clicks"
              ? "bg-zinc-900 text-white"
              : "bg-white border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <MousePointerClick className="w-4 h-4" />
          클릭 기록 ({recentClicks.length})
        </button>
      </div>

      {activeSection === "history" && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">최근 검색 기록</h3>
              <p className="text-sm text-zinc-500 mt-1">
                사용자들의 최근 검색 기록을 관리합니다
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedHistoryIds.length > 0 && (
                <>
                  <span className="text-sm text-zinc-500">
                    {selectedHistoryIds.length}개 선택됨
                  </span>
                  <button
                    type="button"
                    onClick={clearHistoryIds}
                    className="px-3 py-1.5 text-sm border border-zinc-200 rounded hover:bg-zinc-50 cursor-pointer"
                  >
                    선택 해제
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDeleteHistory}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer disabled:opacity-50"
                  >
                    선택 삭제
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() =>
                  selectedHistoryIds.length === recentHistory.length
                    ? clearHistoryIds()
                    : setHistoryIds(recentHistory.map((h) => h.id))
                }
                className="px-3 py-1.5 text-sm border border-zinc-200 rounded hover:bg-zinc-50 cursor-pointer"
              >
                {selectedHistoryIds.length === recentHistory.length
                  ? "전체 해제"
                  : "전체 선택"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="w-10 px-4 py-3" />
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    사용자
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    검색어/URL
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    시간
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-600">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-zinc-100 hover:bg-zinc-50 ${
                      selectedHistoryIds.includes(item.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleHistoryId(item.id)}
                        className="cursor-pointer"
                      >
                        {selectedHistoryIds.includes(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Square className="w-5 h-5 text-zinc-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-zinc-100 rounded text-xs">
                        User #{item.userId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.query ? (
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm">{item.query}</span>
                        </div>
                      ) : item.url ? (
                        <div className="flex items-center gap-2">
                          <Link className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm text-blue-600 truncate max-w-[300px]">
                            {item.url}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.searchedAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteHistory(item.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentHistory.length === 0 && (
            <div className="p-8 text-center text-zinc-400">
              검색 기록이 없습니다
            </div>
          )}
        </div>
      )}

      {activeSection === "clicks" && (
        <div className="bg-white rounded-xl border border-zinc-200">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">최근 클릭 기록</h3>
              <p className="text-sm text-zinc-500 mt-1">
                사용자들의 검색 결과 클릭 기록을 관리합니다
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedClickIds.length > 0 && (
                <>
                  <span className="text-sm text-zinc-500">
                    {selectedClickIds.length}개 선택됨
                  </span>
                  <button
                    type="button"
                    onClick={clearClickIds}
                    className="px-3 py-1.5 text-sm border border-zinc-200 rounded hover:bg-zinc-50 cursor-pointer"
                  >
                    선택 해제
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDeleteClicks}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer disabled:opacity-50"
                  >
                    선택 삭제
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() =>
                  selectedClickIds.length === recentClicks.length
                    ? clearClickIds()
                    : setClickIds(recentClicks.map((c) => c.id))
                }
                className="px-3 py-1.5 text-sm border border-zinc-200 rounded hover:bg-zinc-50 cursor-pointer"
              >
                {selectedClickIds.length === recentClicks.length
                  ? "전체 해제"
                  : "전체 선택"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="w-10 px-4 py-3" />
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    사용자
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    검색어
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    클릭 대상
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">
                    시간
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-zinc-600">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentClicks.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-zinc-100 hover:bg-zinc-50 ${
                      selectedClickIds.includes(item.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleClickId(item.id)}
                        className="cursor-pointer"
                      >
                        {selectedClickIds.includes(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Square className="w-5 h-5 text-zinc-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 bg-zinc-100 rounded text-xs">
                        User #{item.userId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.query || (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.artistId ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">
                            {item.artistName}
                            <span className="text-zinc-400 ml-1">
                              #{item.artistId}
                            </span>
                          </span>
                        </div>
                      ) : item.songId ? (
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            {item.songTitle}
                            <span className="text-zinc-400 ml-1">
                              #{item.songId}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.clickedAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteClick(item.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentClicks.length === 0 && (
            <div className="p-8 text-center text-zinc-400">
              클릭 기록이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
