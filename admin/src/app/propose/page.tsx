"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchTjProposes, type FetchTjProposeResult, type TjProposeLinkFilter, type TjProposeSortKey } from "./actions";
import { PROPOSE_DEFAULT_PAGE_SIZE } from "./constants";

const SORT_OPTIONS: { value: TjProposeSortKey; label: string }[] = [
  { value: "recent", label: "최신 순" },
  { value: "oldest", label: "오래된 순" },
  { value: "hitDesc", label: "추천 많은 순" },
  { value: "hitAsc", label: "추천 적은 순" },
];

const LINK_FILTER_OPTIONS: {
  value: TjProposeLinkFilter;
  label: string;
}[] = [
  { value: "all", label: "전체" },
  { value: "linked", label: "연결됨" },
  { value: "unlinked", label: "미연결" },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const INITIAL_STATE: FetchTjProposeResult = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: PROPOSE_DEFAULT_PAGE_SIZE,
  totalPages: 1,
  hasMore: false,
};

export default function TjProposePage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<TjProposeSortKey>("hitDesc");
  const [linkFilter, setLinkFilter] = useState<TjProposeLinkFilter>("unlinked");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PROPOSE_DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<FetchTjProposeResult>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortKey, linkFilter, pageSize]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchTjProposes({
          page,
          pageSize,
          query: debouncedSearch || undefined,
          sortKey,
          linkFilter,
        });
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("신청곡 정보를 불러오지 못했습니다.");
          setData(INITIAL_STATE);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, sortKey, linkFilter]);

  const rangeLabel = useMemo(() => {
    if (data.totalCount === 0) return "0건";
    const start = (page - 1) * pageSize + 1;
    const end = start + data.items.length - 1;
    return `${start.toLocaleString()}-${end.toLocaleString()} / ${data.totalCount.toLocaleString()}건`;
  }, [data.items.length, data.totalCount, page, pageSize]);

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    if (data.hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <header className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 px-8 py-10 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">
                TJ 신청곡 센터
              </p>
              <h1 className="mt-2 text-4xl font-bold text-zinc-900">
                SongPropose 관리
              </h1>
              <p className="mt-2 text-sm text-zinc-600 max-w-xl">
                사용자들이 TJ 미디어에 등록한 신청곡 데이터를 빠르게 확인하고,
                곡 연결 상태를 모니터링하세요. 검색 및 정렬 기능으로 원하는
                신청곡을 쉽게 찾을 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 px-6 py-4 shadow-sm">
              <p className="text-xs font-semibold text-zinc-500">총 신청곡</p>
              <p className="text-3xl font-bold text-zinc-900">
                {data.totalCount.toLocaleString()}건
              </p>
              <p className="text-xs text-zinc-500">
                페이지 당 {pageSize}건 표시
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg
                    className="h-4 w-4 text-zinc-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="제목, 가수명, 신청자, 내용 검색..."
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:outline-none"
                />
              </div>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as TjProposeSortKey)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 shadow-sm focus:border-orange-400 focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {LINK_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLinkFilter(option.value)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                    linkFilter === option.value
                      ? "border-orange-300 bg-orange-50 text-orange-600"
                      : "border-transparent text-zinc-500 hover:bg-zinc-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm focus:border-orange-400 focus:outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}개씩
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4 text-sm text-zinc-500">
            <span>{rangeLabel}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={page <= 1 || isLoading}
                className="inline-flex h-9 items-center justify-center rounded-2xl border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-orange-200 hover:text-orange-600"
              >
                이전
              </button>
              <span className="text-xs text-zinc-400">
                {page} / {Math.max(data.totalPages, 1)}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!data.hasMore || isLoading}
                className="inline-flex h-9 items-center justify-center rounded-2xl border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-orange-200 hover:text-orange-600"
              >
                다음
              </button>
            </div>
          </div>

          {error ? (
            <div className="px-6 py-16 text-center text-sm text-red-600">
              {error}
            </div>
          ) : isLoading && data.items.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-500">
              데이터를 불러오는 중입니다...
            </div>
          ) : data.items.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-500">
              조건에 해당하는 신청곡이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 text-sm">
                <tbody className="divide-y divide-zinc-50">
                  {data.items.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-orange-50/40">
                      <td className="w-40 px-6 py-5 text-xs text-zinc-500">
                        <div className="text-sm font-semibold text-zinc-900">
                          #{item.id.toString()}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600">
                          <span>추천</span>
                          <span>{item.hit.toLocaleString()}</span>
                        </div>
                        <div className="mt-3 text-[11px] text-zinc-500">
                          등록일 {item.regdateView}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          저장 {formatDateTime(item.saveDateMs)}
                        </div>
                      </td>
                      <td className="min-w-[260px] px-6 py-5">
                        <div className="text-base font-semibold text-zinc-900">
                          {item.songTitle}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {item.songSinger}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span className="rounded-full border border-zinc-200 px-2 py-0.5">
                            장르 {item.otCode}
                          </span>
                          {item.linkedSong ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-600">
                              연결됨
                            </span>
                          ) : (
                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-500">
                              미연결
                            </span>
                          )}
                        </div>
                        {item.linkedSong && (
                          <div className="mt-2 text-xs text-emerald-600">
                            Song #{item.linkedSong.id} · {item.linkedSong.title}
                            {item.linkedSong.titleKo
                              ? ` (${item.linkedSong.titleKo})`
                              : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <p className="whitespace-pre-line text-sm text-zinc-800">
                          {item.content}
                        </p>
                        <div className="mt-3 text-xs text-zinc-500">
                          신청자 {item.requesterName}
                        </div>
                        {item.requesterEmail && (
                          <div className="text-xs text-zinc-400">
                            {item.requesterEmail}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function formatDateTime(ms: number) {
  if (!ms || Number.isNaN(ms)) return "-";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(ms);
  } catch {
    return "-";
  }
}
