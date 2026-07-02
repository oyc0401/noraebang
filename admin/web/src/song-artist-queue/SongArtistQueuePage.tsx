import { type MouseEvent, useEffect, useState } from "react";

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

type PushArtistCreationQueueResponse = {
  requested: number;
  pushed: number;
  skipped: number;
};

type PushSongCreationQueueResponse = {
  requested: number;
  pushed: number;
  skipped: number;
};

type ConnectArtistResponse = {
  queueId: number;
  artistId: number;
  artistName: string;
};

type QueueFilters = {
  title: string;
  artist: string;
  status: StatusFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

type RowMenuState = {
  item: SongArtistQueueItem;
  x: number;
  y: number;
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
  const [selectedTjSongIds, setSelectedTjSongIds] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isPushing, setIsPushing] = useState(false);
  const [isSongPushing, setIsSongPushing] = useState(false);
  const [rowMenu, setRowMenu] = useState<RowMenuState>();

  useEffect(() => {
    async function loadItems() {
      try {
        const result = await fetchSongArtistQueue(filters);
        setItems(result);
        setSelectedTjSongIds((current) => {
          const visibleTjSongIds = new Set(result.map((item) => item.tjSongId));
          return new Set(
            Array.from(current).filter((tjSongId) =>
              visibleTjSongIds.has(tjSongId),
            ),
          );
        });
        setError(undefined);
      } catch (fetchError) {
        setItems(undefined);
        setSelectedTjSongIds(new Set());
        setError(String(fetchError));
      }
    }

    void loadItems();
  }, [filters]);

  useEffect(() => {
    function closeRowMenu() {
      setRowMenu(undefined);
    }

    window.addEventListener("click", closeRowMenu);
    window.addEventListener("keydown", closeRowMenu);

    return () => {
      window.removeEventListener("click", closeRowMenu);
      window.removeEventListener("keydown", closeRowMenu);
    };
  }, []);

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

  const selectedCount = selectedTjSongIds.size;
  const allVisibleSelected =
    items && items.length > 0
      ? items.every((item) => selectedTjSongIds.has(item.tjSongId))
      : false;

  function toggleAllVisibleItems(checked: boolean) {
    setSelectedTjSongIds((current) => {
      const nextSelected = new Set(current);

      for (const item of items ?? []) {
        if (checked) {
          nextSelected.add(item.tjSongId);
        } else {
          nextSelected.delete(item.tjSongId);
        }
      }

      return nextSelected;
    });
  }

  function toggleItem(item: SongArtistQueueItem, checked: boolean) {
    setSelectedTjSongIds((current) => {
      const nextSelected = new Set(current);

      if (checked) {
        nextSelected.add(item.tjSongId);
      } else {
        nextSelected.delete(item.tjSongId);
      }

      return nextSelected;
    });
  }

  async function pushSelectedArtistCreationQueue() {
    const tjSongIds = Array.from(selectedTjSongIds);

    if (tjSongIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `선택 ${tjSongIds.length.toLocaleString()}건을 가수생성큐에 추가할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setIsPushing(true);

    try {
      const result = await pushArtistCreationQueue(tjSongIds);
      setSelectedTjSongIds(new Set());
      setMessage(
        `선택 ${result.requested.toLocaleString()}건 중 ${result.pushed.toLocaleString()}건을 가수생성큐에 추가했습니다. 스킵 ${result.skipped.toLocaleString()}건`,
      );
      setError(undefined);
    } catch (pushError) {
      setError(String(pushError));
      setMessage(undefined);
    } finally {
      setIsPushing(false);
    }
  }

  async function pushSelectedSongCreationQueue() {
    const selectedItems = (items ?? []).filter((item) =>
      selectedTjSongIds.has(item.tjSongId),
    );

    if (selectedItems.length === 0) {
      return;
    }

    // 아티스트 미매칭 곡은 서버에서도 스킵되지만, 미리 걸러서 매칭된 것만 보낸다.
    const matchedTjSongIds = selectedItems
      .filter((item) => item.artistId)
      .map((item) => item.tjSongId);
    const unmatchedCount = selectedItems.length - matchedTjSongIds.length;

    if (matchedTjSongIds.length === 0) {
      window.alert("선택 항목이 모두 미매칭이라 곡생성큐에 넣을 수 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `매칭된 ${matchedTjSongIds.length.toLocaleString()}건을 곡생성큐에 추가할까요?${
        unmatchedCount > 0
          ? ` (미매칭 ${unmatchedCount.toLocaleString()}건 제외)`
          : ""
      }\n미디어 검색 때문에 시간이 걸릴 수 있습니다.`,
    );

    if (!confirmed) {
      return;
    }

    setIsSongPushing(true);

    try {
      const result = await pushSongCreationQueue(matchedTjSongIds);
      setSelectedTjSongIds(new Set());
      setMessage(
        `선택 ${result.requested.toLocaleString()}건 중 ${result.pushed.toLocaleString()}건을 곡생성큐에 추가했습니다. 스킵 ${result.skipped.toLocaleString()}건`,
      );
      setError(undefined);
    } catch (pushError) {
      setError(String(pushError));
      setMessage(undefined);
    } finally {
      setIsSongPushing(false);
    }
  }

  function openRowMenu(
    event: MouseEvent<HTMLTableRowElement>,
    item: SongArtistQueueItem,
  ) {
    event.preventDefault();
    setRowMenu({
      item,
      x: event.clientX,
      y: event.clientY,
    });
  }

  async function connectArtistFromPrompt(item: SongArtistQueueItem) {
    const artistName = window.prompt(
      `${item.tjSongId} / ${item.title}\n연결할 artistName을 입력하세요.`,
      item.artistName ?? item.artist ?? "",
    );

    if (artistName === null || !artistName.trim()) {
      return;
    }

    try {
      const result = await connectSongArtistQueueArtist(
        item.id,
        artistName.trim(),
      );
      setItems((current) =>
        current?.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                artistId: result.artistId,
                artistName: result.artistName,
              }
            : currentItem,
        ),
      );
      setMessage(`${item.tjSongId}를 ${result.artistName}에 연결했습니다.`);
      setError(undefined);
      window.alert("연결되었습니다.");
    } catch (connectError) {
      setError(String(connectError));
      setMessage(undefined);
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
      {message && <p className="mt-4 text-green-700">{message}</p>}

      {!error && !items && <p className="mt-4 text-gray-600">불러오는 중</p>}

      {!error && items && items.length === 0 && (
        <p className="mt-4 text-gray-600">검색 결과가 없습니다.</p>
      )}

      {!error && items && items.length > 0 && (
        <>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              className="cursor-pointer border border-gray-900 px-3 py-1.5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              disabled={selectedCount === 0 || isPushing}
              onClick={pushSelectedArtistCreationQueue}
            >
              {isPushing ? "추가 중" : "가수생성큐에 추가"}
            </button>
            <button
              type="button"
              className="cursor-pointer border border-gray-900 px-3 py-1.5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
              disabled={selectedCount === 0 || isSongPushing}
              onClick={pushSelectedSongCreationQueue}
            >
              {isSongPushing ? "추가 중" : "곡생성큐에 추가"}
            </button>
            <span className="text-sm text-gray-600">
              선택 {selectedCount.toLocaleString()}건
            </span>
          </div>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="w-12 border border-gray-300 p-2.5 text-center"
                  scope="col"
                >
                  <input
                    aria-label="현재 목록 전체 선택"
                    checked={allVisibleSelected}
                    className="cursor-pointer accent-gray-900"
                    type="checkbox"
                    onChange={(event) =>
                      toggleAllVisibleItems(event.target.checked)
                    }
                  />
                </th>
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
                  onContextMenu={(event) => openRowMenu(event, item)}
                >
                  <td className="border border-gray-300 p-2.5 text-center">
                    <input
                      aria-label={`${item.tjSongId} 선택`}
                      checked={selectedTjSongIds.has(item.tjSongId)}
                      className="cursor-pointer accent-gray-900"
                      type="checkbox"
                      onChange={(event) =>
                        toggleItem(item, event.target.checked)
                      }
                    />
                  </td>
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
          {rowMenu && (
            <div
              className="fixed z-50 border border-gray-300 bg-white p-1 shadow"
              style={{ left: rowMenu.x, top: rowMenu.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="block cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100"
                onClick={() => {
                  const item = rowMenu.item;
                  setRowMenu(undefined);
                  void connectArtistFromPrompt(item);
                }}
              >
                가수연결
              </button>
            </div>
          )}
        </>
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

async function pushArtistCreationQueue(
  tjSongIds: string[],
): Promise<PushArtistCreationQueueResponse> {
  const response = await fetch("/api/artist-creation-queue/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tjSongIds }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as PushArtistCreationQueueResponse;
}

async function pushSongCreationQueue(
  tjSongIds: string[],
): Promise<PushSongCreationQueueResponse> {
  const response = await fetch("/api/song-creation-queue/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tjSongIds }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as PushSongCreationQueueResponse;
}

async function connectSongArtistQueueArtist(
  queueId: number,
  artistName: string,
): Promise<ConnectArtistResponse> {
  const response = await fetch(
    `/api/song-artist-queue/${queueId}/artist`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistName }),
    },
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as ConnectArtistResponse;
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
