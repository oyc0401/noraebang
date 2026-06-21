import { useEffect, useRef, useState } from "react";

type SortBy = "title" | "tjNumber" | "artist";
type SortOrder = "asc" | "desc";
type CatalogFilter = "" | "JPOP" | "KPOP";

type SongItem = {
  tjNumber: string;
  title: string;
  artist?: string;
  catalog?: string;
  publishdate?: string;
};

type SongListResponse = {
  data: SongItem[];
  nextOffset: number;
  hasMore: boolean;
  total: number;
};

type SongFilters = {
  title: string;
  artist: string;
  minNumber: string;
  maxNumber: string;
  catalog: CatalogFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

const defaultFilters: SongFilters = {
  title: "",
  artist: "",
  minNumber: "0",
  maxNumber: "99999",
  catalog: "",
  sortBy: "tjNumber",
  sortOrder: "asc",
};

const pageSize = 60;

export function SongPage() {
  const [draftFilters, setDraftFilters] = useState<SongFilters>(defaultFilters);
  const [filters, setFilters] = useState<SongFilters>(defaultFilters);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadFirstPage();
  }, [filters]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (entry?.isIntersecting && hasMore && !isLoading) {
        void loadMore();
      }
    });

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, nextOffset, filters]);

  async function loadFirstPage() {
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await fetchSongs(filters, 0);
      setSongs(result.data);
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (fetchError) {
      setSongs([]);
      setNextOffset(0);
      setHasMore(false);
      setTotal(0);
      setError(String(fetchError));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMore() {
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await fetchSongs(filters, nextOffset);
      setSongs((current) => [...current, ...result.data]);
      setNextOffset(result.nextOffset);
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch (fetchError) {
      setError(String(fetchError));
    } finally {
      setIsLoading(false);
    }
  }

  function applyFilters() {
    setFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
  }

  function updateDraftFilter<K extends keyof SongFilters>(
    key: K,
    value: SongFilters[K],
  ) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="max-w-7xl p-6 text-gray-950">
      <a className="cursor-pointer text-sm text-gray-600 underline" href="/admin">
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">전체 곡</h1>
      <p className="mt-2 text-gray-600">
        TJ 원본 곡을 번호 범위, 이름, 가수, 카탈로그로 검색합니다.
      </p>

      <section aria-labelledby="song-filter-heading" className="mt-6">
        <h2 id="song-filter-heading" className="text-lg font-semibold">
          필터
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="text-sm text-gray-700">이름 검색</span>
            <input
              className="mt-1 w-full border border-gray-300 px-2 py-1.5"
              placeholder="원제/한글/일본어/로마자"
              value={draftFilters.title}
              onChange={(event) => updateDraftFilter("title", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">가수 검색</span>
            <input
              className="mt-1 w-full border border-gray-300 px-2 py-1.5"
              placeholder="TJ 가수명/다국어 아티스트명"
              value={draftFilters.artist}
              onChange={(event) => updateDraftFilter("artist", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">시작 번호</span>
            <input
              className="mt-1 w-full border border-gray-300 px-2 py-1.5"
              inputMode="numeric"
              value={draftFilters.minNumber}
              onChange={(event) =>
                updateDraftFilter("minNumber", event.target.value)
              }
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">끝 번호</span>
            <input
              className="mt-1 w-full border border-gray-300 px-2 py-1.5"
              inputMode="numeric"
              value={draftFilters.maxNumber}
              onChange={(event) =>
                updateDraftFilter("maxNumber", event.target.value)
              }
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">카탈로그</span>
            <select
              className="mt-1 w-full cursor-pointer border border-gray-300 px-2 py-1.5"
              value={draftFilters.catalog}
              onChange={(event) =>
                updateDraftFilter("catalog", parseCatalogFilter(event.target.value))
              }
            >
              <option value="">전체</option>
              <option value="JPOP">JPOP</option>
              <option value="KPOP">KPOP</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">정렬 기준</span>
            <select
              className="mt-1 w-full cursor-pointer border border-gray-300 px-2 py-1.5"
              value={draftFilters.sortBy}
              onChange={(event) =>
                updateDraftFilter("sortBy", parseSortBy(event.target.value))
              }
            >
              <option value="tjNumber">노래방번호</option>
              <option value="title">이름</option>
              <option value="artist">가수</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">정렬 방향</span>
            <select
              className="mt-1 w-full cursor-pointer border border-gray-300 px-2 py-1.5"
              value={draftFilters.sortOrder}
              onChange={(event) =>
                updateDraftFilter("sortOrder", parseSortOrder(event.target.value))
              }
            >
              <option value="asc">오름차순</option>
              <option value="desc">내림차순</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="cursor-pointer border border-gray-900 px-3 py-1.5"
              onClick={applyFilters}
            >
              검색
            </button>
            <button
              type="button"
              className="cursor-pointer border border-gray-300 px-3 py-1.5 text-gray-700"
              onClick={resetFilters}
            >
              초기화
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="song-list-heading" className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <h2 id="song-list-heading" className="text-lg font-semibold">
            곡 목록
          </h2>
          <p className="text-sm text-gray-600">
            {songs.length.toLocaleString()} / {total.toLocaleString()}개 표시
          </p>
        </div>

        {error && <p className="mt-3 text-red-700">{error}</p>}

        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                노래방번호
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                이름
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                가수
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                카탈로그
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                등록일
              </th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr key={song.tjNumber}>
                <td className="border border-gray-300 p-2.5">{song.tjNumber}</td>
                <td className="border border-gray-300 p-2.5">{song.title}</td>
                <td className="border border-gray-300 p-2.5">
                  {song.artist ?? "-"}
                </td>
                <td className="border border-gray-300 p-2.5">
                  {song.catalog ?? "-"}
                </td>
                <td className="border border-gray-300 p-2.5">
                  {song.publishdate ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!isLoading && songs.length === 0 && !error && (
          <p className="mt-4 text-gray-600">검색 결과가 없습니다.</p>
        )}

        <div ref={loadMoreRef} className="h-10" />

        {isLoading && <p className="mt-3 text-gray-600">불러오는 중</p>}
        {!hasMore && songs.length > 0 && (
          <p className="mt-3 text-gray-600">마지막 목록입니다.</p>
        )}
      </section>
    </main>
  );
}

async function fetchSongs(
  filters: SongFilters,
  offset: number,
): Promise<SongListResponse> {
  const params = new URLSearchParams({
    minNumber: filters.minNumber || "0",
    maxNumber: filters.maxNumber || "99999",
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    offset: offset.toString(),
    limit: pageSize.toString(),
  });

  if (filters.title.trim()) {
    params.set("title", filters.title.trim());
  }

  if (filters.artist.trim()) {
    params.set("artist", filters.artist.trim());
  }

  if (filters.catalog) {
    params.set("catalog", filters.catalog);
  }

  const response = await fetch(`/api/song?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body: SongListResponse = await response.json();
  return body;
}

function parseCatalogFilter(value: string): CatalogFilter {
  if (value === "JPOP" || value === "KPOP") {
    return value;
  }

  return "";
}

function parseSortBy(value: string): SortBy {
  if (value === "title" || value === "artist" || value === "tjNumber") {
    return value;
  }

  return "tjNumber";
}

function parseSortOrder(value: string): SortOrder {
  return value === "desc" ? "desc" : "asc";
}
