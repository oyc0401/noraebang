import { useEffect, useState } from "react";

type SortBy = "createdAt" | "tjSongId" | "title" | "artist";
type SortOrder = "asc" | "desc";
type StatusFilter = "" | "matched" | "unmatched";

type SongArtistQueueItem = {
  id: number;
  tjSongId: string;
  title: string;
  artist?: string;
  artistId?: number;
  artistName?: string;
  createdAt: string;
};

type SongArtistQueueListResponse = {
  data: SongArtistQueueItem[];
};

type QueueFilters = {
  title: string;
  artist: string;
  status: StatusFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

const defaultFilters: QueueFilters = {
  title: "",
  artist: "",
  status: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export function SongArtistQueuePage() {
  const initialFilters = parseFiltersFromUrl();
  const [draftFilters, setDraftFilters] =
    useState<QueueFilters>(initialFilters);
  const [filters, setFilters] = useState<QueueFilters>(initialFilters);
  const [items, setItems] = useState<SongArtistQueueItem[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function loadItems() {
      try {
        const result = await fetchSongArtistQueue(filters);
        setItems(result);
        setError(undefined);
      } catch (fetchError) {
        setItems(undefined);
        setError(String(fetchError));
      }
    }

    void loadItems();
  }, [filters]);

  function applyFilters() {
    setFilters(draftFilters);
    writeFiltersToUrl(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
    writeFiltersToUrl(defaultFilters);
  }

  function updateDraftFilter<K extends keyof QueueFilters>(
    key: K,
    value: QueueFilters[K],
  ) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="max-w-5xl p-6 text-gray-950">
      <a
        className="cursor-pointer text-sm text-gray-600 underline"
        href="/admin"
      >
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">가수있는곡큐 상태</h1>
      <p className="mt-2 text-gray-600">
        song_artist_queue 테이블에 쌓인 항목입니다.
      </p>

      <section aria-labelledby="song-artist-queue-filter-heading" className="mt-6">
        <h2 id="song-artist-queue-filter-heading" className="text-lg font-semibold">
          필터
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="text-sm text-gray-700">제목 검색</span>
            <input
              className="mt-1 w-full border border-gray-300 px-2 py-1.5"
              value={draftFilters.title}
              onChange={(event) =>
                updateDraftFilter("title", event.target.value)
              }
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">아티스트 검색</span>
            <input
              className="mt-1 w-full border border-gray-300 px-2 py-1.5"
              value={draftFilters.artist}
              onChange={(event) =>
                updateDraftFilter("artist", event.target.value)
              }
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">가수 매칭 상태</span>
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
              <option value="matched">매칭됨</option>
              <option value="unmatched">미매칭</option>
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
              <option value="createdAt">등록 시각</option>
              <option value="tjSongId">노래방번호</option>
              <option value="title">제목</option>
              <option value="artist">아티스트</option>
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

      {error && <p className="mt-4 text-red-700">{error}</p>}

      {!error && !items && <p className="mt-4 text-gray-600">불러오는 중</p>}

      {!error && items && items.length === 0 && (
        <p className="mt-4 text-gray-600">검색 결과가 없습니다.</p>
      )}

      {!error && items && items.length > 0 && (
        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                TJ 번호
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                제목
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                TJ 아티스트
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                매칭된 가수
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                등록 시각
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                className={item.artistId ? "" : "bg-yellow-50"}
                key={item.id}
              >
                <td className="border border-gray-300 p-2.5">
                  {item.tjSongId}
                </td>
                <td className="border border-gray-300 p-2.5">{item.title}</td>
                <td className="border border-gray-300 p-2.5">
                  {item.artist ?? "-"}
                </td>
                <td className="border border-gray-300 p-2.5">
                  {item.artistName ?? "미매칭"}
                </td>
                <td className="border border-gray-300 p-2.5">
                  {formatCreatedAt(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

async function fetchSongArtistQueue(
  filters: QueueFilters,
): Promise<SongArtistQueueItem[]> {
  const params = new URLSearchParams({
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  if (filters.title.trim()) {
    params.set("title", filters.title.trim());
  }

  if (filters.artist.trim()) {
    params.set("artist", filters.artist.trim());
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const response = await fetch(`/api/song-artist-queue?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body = (await response.json()) as SongArtistQueueListResponse;
  return body.data;
}

function formatCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function parseStatusFilter(value: string): StatusFilter {
  if (value === "matched" || value === "unmatched") {
    return value;
  }

  return "";
}

function parseSortBy(value: string): SortBy {
  if (
    value === "tjSongId" ||
    value === "title" ||
    value === "artist" ||
    value === "createdAt"
  ) {
    return value;
  }

  return "createdAt";
}

function parseSortOrder(value: string): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

function parseFiltersFromUrl(): QueueFilters {
  const params = new URLSearchParams(window.location.search);

  return {
    title: params.get("title") ?? defaultFilters.title,
    artist: params.get("artist") ?? defaultFilters.artist,
    status: parseStatusFilter(params.get("status") ?? ""),
    sortBy: parseSortBy(params.get("sortBy") ?? ""),
    sortOrder: parseSortOrder(params.get("sortOrder") ?? ""),
  };
}

function writeFiltersToUrl(filters: QueueFilters) {
  const params = new URLSearchParams();

  if (filters.title.trim()) {
    params.set("title", filters.title.trim());
  }

  if (filters.artist.trim()) {
    params.set("artist", filters.artist.trim());
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
  const nextUrl = query
    ? `/admin/song-artist-queue?${query}`
    : "/admin/song-artist-queue";

  window.history.replaceState(null, "", nextUrl);
}
