import { useEffect, useRef, useState } from "react";

type SortBy = "title" | "tjNumber" | "artist";
type SortOrder = "asc" | "desc";
type CatalogFilter = "" | "JPOP" | "KPOP" | "POP" | "CPOP" | "NONE";
type StatusFilter = "" | "song" | "queueOnly" | "none";

type TjSongItem = {
  tjNumber: string;
  title: string;
  artist?: string;
  catalog?: string;
  publishdate?: string;
  isCreatedAsSong: boolean;
  isInQueue: boolean;
};

type TjSongListResponse = {
  data: TjSongItem[];
  nextOffset: number;
  hasMore: boolean;
  total: number;
};

type TjSongFilters = {
  title: string;
  artist: string;
  minNumber: string;
  maxNumber: string;
  catalog: CatalogFilter;
  status: StatusFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

const defaultFilters: TjSongFilters = {
  title: "",
  artist: "",
  minNumber: "0",
  maxNumber: "99999",
  catalog: "",
  status: "",
  sortBy: "tjNumber",
  sortOrder: "asc",
};

const pageSize = 60;

export function TjSongPage() {
  const initialFilters = parseFiltersFromUrl();
  const [draftFilters, setDraftFilters] =
    useState<TjSongFilters>(initialFilters);
  const [filters, setFilters] = useState<TjSongFilters>(initialFilters);
  const [songs, setSongs] = useState<TjSongItem[]>([]);
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
      const result = await fetchTjSongs(filters, 0);
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
      const result = await fetchTjSongs(filters, nextOffset);
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
    writeFiltersToUrl(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
    writeFiltersToUrl(defaultFilters);
  }

  function updateDraftFilter<K extends keyof TjSongFilters>(
    key: K,
    value: TjSongFilters[K],
  ) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="max-w-7xl p-6 text-gray-950">
      <a
        className="cursor-pointer text-sm text-gray-600 underline"
        href="/admin"
      >
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">전체 TJ 곡</h1>
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
              onChange={(event) =>
                updateDraftFilter("title", event.target.value)
              }
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">가수 검색</span>
            <input
              className="mt-1 w-full border border-gray-300 px-2 py-1.5"
              placeholder="TJ 가수명/다국어 아티스트명"
              value={draftFilters.artist}
              onChange={(event) =>
                updateDraftFilter("artist", event.target.value)
              }
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
                updateDraftFilter(
                  "catalog",
                  parseCatalogFilter(event.target.value),
                )
              }
            >
              <option value="">모두</option>
              <option value="JPOP">JPOP</option>
              <option value="KPOP">KPOP</option>
              <option value="POP">POP</option>
              <option value="CPOP">CPOP</option>
              <option value="NONE">없음</option>
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
            <span className="text-sm text-gray-700">상태</span>
            <select
              className="mt-1 w-full cursor-pointer border border-gray-300 px-2 py-1.5"
              value={draftFilters.status}
              onChange={(event) =>
                updateDraftFilter(
                  "status",
                  parseStatusFilter(event.target.value),
                )
              }
            >
              <option value="">모두</option>
              <option value="song">Song에 있음</option>
              <option value="queueOnly">Song에 없음 + 큐에 있음</option>
              <option value="none">Song에도 없고 큐에도 없음</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">정렬 방향</span>
            <select
              className="mt-1 w-full cursor-pointer border border-gray-300 px-2 py-1.5"
              value={draftFilters.sortOrder}
              onChange={(event) =>
                updateDraftFilter(
                  "sortOrder",
                  parseSortOrder(event.target.value),
                )
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
              <th
                className="border border-gray-300 p-2.5 text-left"
                scope="col"
              >
                노래방번호
              </th>
              <th
                className="border border-gray-300 p-2.5 text-left"
                scope="col"
              >
                이름
              </th>
              <th
                className="border border-gray-300 p-2.5 text-left"
                scope="col"
              >
                가수
              </th>
              <th
                className="border border-gray-300 p-2.5 text-left"
                scope="col"
              >
                카탈로그
              </th>
              <th
                className="border border-gray-300 p-2.5 text-left"
                scope="col"
              >
                등록일
              </th>
              <th
                className="border border-gray-300 p-2.5 text-left"
                scope="col"
              >
                Song 여부
              </th>
              <th
                className="border border-gray-300 p-2.5 text-left"
                scope="col"
              >
                큐 여부
              </th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr
                className={getCatalogRowClassName(song.catalog)}
                key={song.tjNumber}
              >
                <td className="border border-gray-300 p-2.5">
                  {song.tjNumber}
                </td>
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
                <td className="border border-gray-300 p-2.5">
                  {song.isCreatedAsSong ? "생성됨" : "미생성"}
                </td>
                <td className="border border-gray-300 p-2.5">
                  {song.isInQueue ? "큐에 있음" : "-"}
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

async function fetchTjSongs(
  filters: TjSongFilters,
  offset: number,
): Promise<TjSongListResponse> {
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

  if (filters.status) {
    params.set("status", filters.status);
  }

  const response = await fetch(`/api/tj-song?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body: TjSongListResponse = await response.json();
  return body;
}

function parseCatalogFilter(value: string): CatalogFilter {
  if (
    value === "JPOP" ||
    value === "KPOP" ||
    value === "POP" ||
    value === "CPOP" ||
    value === "NONE"
  ) {
    return value;
  }

  return "";
}

function parseStatusFilter(value: string): StatusFilter {
  if (value === "song" || value === "queueOnly" || value === "none") {
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

function getCatalogRowClassName(catalog?: string): string {
  const normalizedCatalog = catalog?.toUpperCase();

  if (normalizedCatalog === "JPOP") {
    return "bg-red-50";
  }

  if (normalizedCatalog === "KPOP") {
    return "bg-blue-50";
  }

  if (normalizedCatalog === "POP") {
    return "bg-green-50";
  }

  if (normalizedCatalog === "CPOP") {
    return "bg-yellow-50";
  }

  return "";
}

function parseFiltersFromUrl(): TjSongFilters {
  const params = new URLSearchParams(window.location.search);

  return {
    title: params.get("title") ?? defaultFilters.title,
    artist: params.get("artist") ?? defaultFilters.artist,
    minNumber: params.get("minNumber") ?? defaultFilters.minNumber,
    maxNumber: params.get("maxNumber") ?? defaultFilters.maxNumber,
    catalog: parseCatalogFilter(params.get("catalog") ?? ""),
    status: parseStatusFilter(params.get("status") ?? ""),
    sortBy: parseSortBy(params.get("sortBy") ?? ""),
    sortOrder: parseSortOrder(params.get("sortOrder") ?? ""),
  };
}

function writeFiltersToUrl(filters: TjSongFilters) {
  const params = new URLSearchParams();

  if (filters.title.trim()) {
    params.set("title", filters.title.trim());
  }

  if (filters.artist.trim()) {
    params.set("artist", filters.artist.trim());
  }

  if (filters.minNumber !== defaultFilters.minNumber) {
    params.set("minNumber", filters.minNumber);
  }

  if (filters.maxNumber !== defaultFilters.maxNumber) {
    params.set("maxNumber", filters.maxNumber);
  }

  if (filters.catalog) {
    params.set("catalog", filters.catalog);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.sortBy !== defaultFilters.sortBy) {
    params.set("sortBy", filters.sortBy);
  }

  if (filters.sortOrder !== defaultFilters.sortOrder) {
    params.set("sortOrder", filters.sortOrder);
  }

  const query = params.toString();
  const nextUrl = query ? `/admin/tj-song?${query}` : "/admin/tj-song";

  window.history.replaceState(null, "", nextUrl);
}
