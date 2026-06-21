import { useEffect, useState } from "react";

type SortBy = "tjNumber" | "title" | "artist" | "createdAt";
type SortOrder = "asc" | "desc";
type CatalogFilter = "" | "JPOP" | "KPOP" | "POP" | "CPOP" | "NONE";

type SongQueueItem = {
  id: number;
  tjNumber: string;
  title: string;
  artist?: string;
  publishdate?: string;
  catalog?: string;
  createdAt: string;
};

type SongQueueListResponse = {
  data: SongQueueItem[];
};

type RemoveSongQueueItemsResponse = {
  deletedCount: number;
};

type PushSongArtistQueueItem = {
  tjSongId: string;
  artist?: string;
};

type PushSongArtistQueueResponse = {
  requested: number;
  pushed: number;
  matched: number;
  unmatched: number;
};

type QueueFilters = {
  title: string;
  artist: string;
  minNumber: string;
  maxNumber: string;
  catalog: CatalogFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

const defaultFilters: QueueFilters = {
  title: "",
  artist: "",
  minNumber: "0",
  maxNumber: "99999",
  catalog: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export function QueuePage() {
  const initialFilters = parseFiltersFromUrl();
  const [draftFilters, setDraftFilters] =
    useState<QueueFilters>(initialFilters);
  const [filters, setFilters] = useState<QueueFilters>(initialFilters);
  const [items, setItems] = useState<SongQueueItem[]>();
  const [error, setError] = useState<string>();
  const [selectedTjNumbers, setSelectedTjNumbers] = useState<Set<string>>(
    new Set(),
  );
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>();
  const visibleItems = items ?? [];
  const isAllVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedTjNumbers.has(item.tjNumber));

  useEffect(() => {
    async function loadQueue() {
      try {
        const result = await fetchSongQueue(filters);
        setItems(result);
        setSelectedTjNumbers((current) =>
          filterVisibleSelections(current, result),
        );
        setError(undefined);
      } catch (fetchError) {
        setItems(undefined);
        setError(String(fetchError));
      }
    }

    void loadQueue();
  }, [filters]);

  async function refreshQueue() {
    try {
      const result = await fetchSongQueue(filters);
      setItems(result);
      setSelectedTjNumbers((current) =>
        filterVisibleSelections(current, result),
      );
      setError(undefined);
    } catch (fetchError) {
      setItems(undefined);
      setError(String(fetchError));
    }
  }

  function applyFilters() {
    setFilters(draftFilters);
    writeFiltersToUrl(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
    setSelectedTjNumbers(new Set());
    writeFiltersToUrl(defaultFilters);
  }

  function updateDraftFilter<K extends keyof QueueFilters>(
    key: K,
    value: QueueFilters[K],
  ) {
    if (key === "sortBy" || key === "sortOrder") {
      setSelectedTjNumbers(new Set());
    }

    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleItem(tjNumber: string) {
    setSelectedTjNumbers((current) => {
      const next = new Set(current);

      if (next.has(tjNumber)) {
        next.delete(tjNumber);
      } else {
        next.add(tjNumber);
      }

      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedTjNumbers((current) => {
      const next = new Set(current);

      if (isAllVisibleSelected) {
        for (const item of visibleItems) {
          next.delete(item.tjNumber);
        }
      } else {
        for (const item of visibleItems) {
          next.add(item.tjNumber);
        }
      }

      return next;
    });
  }

  async function pushSongArtistQueue() {
    const pushItems = visibleItems
      .filter((item) => selectedTjNumbers.has(item.tjNumber))
      .map((item) => ({
        tjSongId: item.tjNumber,
        artist: item.artist,
      }));
    const tjNumbers = pushItems.map((item) => item.tjSongId);

    if (pushItems.length === 0) {
      window.alert("선택한 행이 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `${pushItems.length.toLocaleString()}개의 행을 가수있는곡큐에 푸시하고 최근곡큐에서 삭제할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setIsSyncing(true);
    setError(undefined);

    try {
      const result = await pushSongArtistQueueItems(pushItems);
      const removeResult = await removeSongQueueItems(tjNumbers);
      await refreshQueue();
      setSyncMessage(
        `선택 ${result.requested.toLocaleString()}건 중 ${result.pushed.toLocaleString()}건 푸시, 최근곡큐 ${removeResult.deletedCount.toLocaleString()}건 삭제: 가수 매칭 ${result.matched.toLocaleString()}건, 미매칭 ${result.unmatched.toLocaleString()}건`,
      );
    } catch (syncError) {
      setError(String(syncError));
    } finally {
      setIsSyncing(false);
    }
  }

  async function removeSelectedItems() {
    const tjNumbers = Array.from(selectedTjNumbers);

    if (tjNumbers.length === 0) {
      window.alert("선택한 행이 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `${tjNumbers.length.toLocaleString()}개의 행을 큐에서 제거할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setIsRemoving(true);
    setError(undefined);

    try {
      await removeSongQueueItems(tjNumbers);
      setSelectedTjNumbers(new Set());
      await refreshQueue();
    } catch (removeError) {
      setError(String(removeError));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <main className="max-w-5xl p-6 text-gray-950">
      <a
        className="cursor-pointer text-sm text-gray-600 underline"
        href="/admin"
      >
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">노래 큐 상태</h1>
      <p className="mt-2 text-gray-600">song_queue 테이블에 쌓인 항목입니다.</p>

      <section aria-labelledby="queue-filter-heading" className="mt-6">
        <h2 id="queue-filter-heading" className="text-lg font-semibold">
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
              <option value="createdAt">등록 시각</option>
              <option value="tjNumber">노래방번호</option>
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
        <>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              className="cursor-pointer border border-gray-900 px-3 py-1.5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              disabled={selectedTjNumbers.size === 0 || isSyncing}
              onClick={pushSongArtistQueue}
            >
              곡가수큐로 이동
            </button>
            <p className="text-sm text-gray-600">
              {selectedTjNumbers.size.toLocaleString()}개 행 선택됨
            </p>
            {syncMessage && (
              <p className="text-sm text-gray-600">{syncMessage}</p>
            )}
            <button
              type="button"
              className="ml-auto cursor-pointer border border-red-700 bg-red-700 px-3 py-1.5 text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
              disabled={selectedTjNumbers.size === 0 || isRemoving}
              onClick={removeSelectedItems}
            >
              선택 항목 큐에서 제거
            </button>
          </div>

          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="w-12 border border-gray-300 p-2.5 text-left"
                  scope="col"
                >
                  <input
                    aria-label="전체 선택"
                    checked={isAllVisibleSelected}
                    className="cursor-pointer"
                    type="checkbox"
                    onChange={toggleAllVisible}
                  />
                </th>
                <th
                  className="border border-gray-300 p-2.5 text-left"
                  scope="col"
                >
                  TJ 번호
                </th>
                <th
                  className="border border-gray-300 p-2.5 text-left"
                  scope="col"
                >
                  제목
                </th>
                <th
                  className="border border-gray-300 p-2.5 text-left"
                  scope="col"
                >
                  아티스트
                </th>
                <th
                  className="border border-gray-300 p-2.5 text-left"
                  scope="col"
                >
                  발매일
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
                  등록 시각
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  className={getCatalogRowClassName(item.catalog)}
                  key={item.id}
                >
                  <td className="border border-gray-300 p-2.5">
                    <input
                      aria-label={`${item.tjNumber} 선택`}
                      checked={selectedTjNumbers.has(item.tjNumber)}
                      className="cursor-pointer"
                      type="checkbox"
                      onChange={() => toggleItem(item.tjNumber)}
                    />
                  </td>
                  <td className="border border-gray-300 p-2.5">
                    {item.tjNumber}
                  </td>
                  <td className="border border-gray-300 p-2.5">{item.title}</td>
                  <td className="border border-gray-300 p-2.5">
                    {item.artist ?? "-"}
                  </td>
                  <td className="border border-gray-300 p-2.5">
                    {item.publishdate ?? "-"}
                  </td>
                  <td className="border border-gray-300 p-2.5">
                    {item.catalog ?? "-"}
                  </td>
                  <td className="border border-gray-300 p-2.5">
                    {formatCreatedAt(item.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}

async function fetchSongQueue(filters: QueueFilters): Promise<SongQueueItem[]> {
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

  if (filters.minNumber && filters.minNumber !== defaultFilters.minNumber) {
    params.set("minNumber", filters.minNumber);
  }

  if (filters.maxNumber && filters.maxNumber !== defaultFilters.maxNumber) {
    params.set("maxNumber", filters.maxNumber);
  }

  if (filters.catalog) {
    params.set("catalog", filters.catalog);
  }

  const response = await fetch(`/api/queue?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body = (await response.json()) as SongQueueListResponse;
  return body.data;
}

async function removeSongQueueItems(
  tjNumbers: string[],
): Promise<RemoveSongQueueItemsResponse> {
  const response = await fetch("/api/queue/remove", {
    body: JSON.stringify({ tjNumbers }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as RemoveSongQueueItemsResponse;
}

async function pushSongArtistQueueItems(
  items: PushSongArtistQueueItem[],
): Promise<PushSongArtistQueueResponse> {
  const response = await fetch("/api/song-artist-queue/push", {
    body: JSON.stringify({ items }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as PushSongArtistQueueResponse;
}

function formatCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
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

function parseSortBy(value: string): SortBy {
  if (
    value === "tjNumber" ||
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

function filterVisibleSelections(
  selectedTjNumbers: Set<string>,
  items: SongQueueItem[],
): Set<string> {
  const visibleTjNumbers = new Set(items.map((item) => item.tjNumber));
  const next = new Set(
    Array.from(selectedTjNumbers).filter((tjNumber) =>
      visibleTjNumbers.has(tjNumber),
    ),
  );

  return next.size === selectedTjNumbers.size ? selectedTjNumbers : next;
}

function parseFiltersFromUrl(): QueueFilters {
  const params = new URLSearchParams(window.location.search);

  return {
    title: params.get("title") ?? defaultFilters.title,
    artist: params.get("artist") ?? defaultFilters.artist,
    minNumber: params.get("minNumber") ?? defaultFilters.minNumber,
    maxNumber: params.get("maxNumber") ?? defaultFilters.maxNumber,
    catalog: parseCatalogFilter(params.get("catalog") ?? ""),
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

  if (filters.minNumber !== defaultFilters.minNumber) {
    params.set("minNumber", filters.minNumber);
  }

  if (filters.maxNumber !== defaultFilters.maxNumber) {
    params.set("maxNumber", filters.maxNumber);
  }

  if (filters.catalog) {
    params.set("catalog", filters.catalog);
  }

  if (filters.sortBy !== defaultFilters.sortBy) {
    params.set("sortBy", filters.sortBy);
  }

  if (filters.sortOrder !== defaultFilters.sortOrder) {
    params.set("sortOrder", filters.sortOrder);
  }

  const query = params.toString();
  const nextUrl = query ? `/admin/queue?${query}` : "/admin/queue";

  window.history.replaceState(null, "", nextUrl);
}
