import { useEffect, useState } from "react";

type MediaTab = "youtube" | "spotify";
type SortBy = "popular" | "fetchedAt" | "name";

// jpop DB Artist에서 media 항목에 연결된 아티스트
type LinkedArtist = {
  id: number;
  name: string;
};

type YoutubeChannelItem = {
  id: string;
  title?: string;
  customUrl?: string;
  thumbnail?: string;
  subscriberCount?: string;
  videoCount?: string;
  storedVideoCount: number;
  fetchedAt?: string;
  artists: LinkedArtist[];
};

type SpotifyArtistItem = {
  id: string;
  name: string;
  image?: string;
  followers?: string;
  popularity?: number;
  storedTrackCount: number;
  fetchedAt?: string;
  artists: LinkedArtist[];
};

type MediaListResponse<Item> = {
  data: Item[];
  nextOffset: number;
  hasMore: boolean;
  total: number;
};

type YoutubeChannelUpdateResult = {
  channelId: string;
  title?: string;
  newVideoCount: number;
  apiCallCount: number;
};

type YoutubeVideoStatsRefreshResult = {
  channelId: string;
  videoCount: number;
  apiCallCount: number;
};

type SpotifyArtistUpdateResult = {
  artistId: string;
  name: string;
  albumCount: number;
  newTrackCount: number;
  linkedTrackCount: number;
  apiCallCount: number;
};

type RowStatus = {
  isBusy: boolean;
  message?: string;
  isError?: boolean;
};

type BulkProgress = {
  done: number;
  total: number;
  // youtube 탭이면 신규 영상, spotify 탭이면 신규 트랙 누계
  newItemCount: number;
  apiCallCount: number;
  failedCount: number;
};

const pageSize = 50;
// jpop 필터는 전체 선택 업데이트를 위해 한 번에 다 불러온다. (아티스트 채널 ~1천 개)
const jpopPageSize = 2000;

export function MediaPage() {
  const [tab, setTab] = useState<MediaTab>(parseTabFromUrl());
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  const [channels, setChannels] = useState<YoutubeChannelItem[]>([]);
  const [artists, setArtists] = useState<SpotifyArtistItem[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string>();
  const [rowStatuses, setRowStatuses] = useState<Record<string, RowStatus>>({});
  // 기본은 우리 DB 아티스트에 연결된 항목만 (전체 탐색이 필요할 때만 해제)
  const [jpopOnly, setJpopOnly] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

  const isBulkRunning =
    bulkProgress !== null && bulkProgress.done < bulkProgress.total;

  useEffect(() => {
    void loadFirstPage();
  }, [tab, search, sortBy, jpopOnly]);

  async function loadFirstPage() {
    setIsLoading(true);
    setListError(undefined);
    setRowStatuses({});
    setSelectedIds(new Set());
    setBulkProgress(null);

    try {
      if (tab === "youtube") {
        const result = await fetchYoutubeChannels(search, sortBy, jpopOnly, 0);
        setChannels(result.data);
        applyPageMeta(result);
      } else {
        const result = await fetchSpotifyArtists(search, sortBy, jpopOnly, 0);
        setArtists(result.data);
        applyPageMeta(result);
      }
    } catch (fetchError) {
      setChannels([]);
      setArtists([]);
      setNextOffset(0);
      setHasMore(false);
      setTotal(0);
      setListError(String(fetchError));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMore() {
    setIsLoading(true);
    setListError(undefined);

    try {
      if (tab === "youtube") {
        const result = await fetchYoutubeChannels(
          search,
          sortBy,
          jpopOnly,
          nextOffset,
        );
        setChannels((current) => [...current, ...result.data]);
        applyPageMeta(result);
      } else {
        const result = await fetchSpotifyArtists(
          search,
          sortBy,
          jpopOnly,
          nextOffset,
        );
        setArtists((current) => [...current, ...result.data]);
        applyPageMeta(result);
      }
    } catch (fetchError) {
      setListError(String(fetchError));
    } finally {
      setIsLoading(false);
    }
  }

  function applyPageMeta(result: MediaListResponse<unknown>) {
    setNextOffset(result.nextOffset);
    setHasMore(result.hasMore);
    setTotal(result.total);
  }

  function changeTab(nextTab: MediaTab) {
    if (nextTab === tab) {
      return;
    }

    setTab(nextTab);
    writeTabToUrl(nextTab);
  }

  function setRowStatus(id: string, status: RowStatus) {
    setRowStatuses((current) => ({ ...current, [id]: status }));
  }

  // 성공하면 결과를, 실패하면 null을 반환한다. (일괄 업데이트에서 재사용)
  async function updateChannelRow(
    channelId: string,
  ): Promise<YoutubeChannelUpdateResult | null> {
    setRowStatus(channelId, { isBusy: true, message: "업데이트 중..." });

    try {
      const result = await postJson<YoutubeChannelUpdateResult>(
        `/api/media/youtube-channels/${channelId}/update`,
      );
      setChannels((current) =>
        current.map((item) =>
          item.id === channelId
            ? {
                ...item,
                storedVideoCount: item.storedVideoCount + result.newVideoCount,
                fetchedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setRowStatus(channelId, {
        isBusy: false,
        message: `신규 영상 ${result.newVideoCount}건 · API ${result.apiCallCount}회`,
      });

      return result;
    } catch (updateError) {
      setRowStatus(channelId, {
        isBusy: false,
        message: String(updateError),
        isError: true,
      });

      return null;
    }
  }

  function toggleSelected(channelId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }

      return next;
    });
  }

  function toggleSelectAll() {
    const listIds =
      tab === "youtube"
        ? channels.map((channel) => channel.id)
        : artists.map((artist) => artist.id);

    setSelectedIds((current) =>
      current.size === listIds.length ? new Set() : new Set(listIds),
    );
  }

  async function handleBulkUpdate() {
    if (tab === "youtube") {
      const targets = channels.filter((channel) => selectedIds.has(channel.id));

      if (targets.length === 0) {
        return;
      }

      const emptyCount = targets.filter(
        (channel) => channel.storedVideoCount === 0,
      ).length;
      const confirmed = window.confirm(
        `선택한 채널 ${targets.length}개를 순차 업데이트합니다.` +
          (emptyCount > 0
            ? `\n저장된 영상이 없는 채널 ${emptyCount}개는 전체 수집이라 시간과 쿼터가 많이 들 수 있습니다.`
            : ""),
      );

      if (!confirmed) {
        return;
      }

      await runBulk(
        targets.map((target) => target.id),
        async (id) => {
          const result = await updateChannelRow(id);
          return result
            ? { newItems: result.newVideoCount, apiCalls: result.apiCallCount }
            : null;
        },
      );
      return;
    }

    const targets = artists.filter((artist) => selectedIds.has(artist.id));

    if (targets.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `선택한 아티스트 ${targets.length}명을 순차 업데이트합니다.\n아티스트당 앨범 수만큼 API를 호출해서 오래 걸릴 수 있습니다.`,
    );

    if (!confirmed) {
      return;
    }

    await runBulk(
      targets.map((target) => target.id),
      async (id) => {
        const result = await updateArtistRow(id);
        return result
          ? { newItems: result.newTrackCount, apiCalls: result.apiCallCount }
          : null;
      },
    );
  }

  async function runBulk(
    targetIds: string[],
    updateOne: (
      id: string,
    ) => Promise<{ newItems: number; apiCalls: number } | null>,
  ) {
    setBulkProgress({
      done: 0,
      total: targetIds.length,
      newItemCount: 0,
      apiCallCount: 0,
      failedCount: 0,
    });

    for (const targetId of targetIds) {
      const result = await updateOne(targetId);

      setBulkProgress((current) =>
        current
          ? {
              ...current,
              done: current.done + 1,
              newItemCount: current.newItemCount + (result?.newItems ?? 0),
              apiCallCount: current.apiCallCount + (result?.apiCalls ?? 0),
              failedCount: current.failedCount + (result ? 0 : 1),
            }
          : current,
      );
    }
  }

  async function handleChannelStatsRefresh(channel: YoutubeChannelItem) {
    const estimatedCalls = Math.ceil(channel.storedVideoCount / 50);
    const confirmed = window.confirm(
      `저장된 영상 ${channel.storedVideoCount}건의 통계를 갱신합니다.\n유튜브 API 약 ${estimatedCalls}회를 사용합니다. 진행할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setRowStatus(channel.id, { isBusy: true, message: "통계 갱신 중..." });

    try {
      const result = await postJson<YoutubeVideoStatsRefreshResult>(
        `/api/media/youtube-channels/${channel.id}/refresh-video-stats`,
      );
      setRowStatus(channel.id, {
        isBusy: false,
        message: `영상 ${result.videoCount}건 통계 갱신 · API ${result.apiCallCount}회`,
      });
    } catch (updateError) {
      setRowStatus(channel.id, {
        isBusy: false,
        message: String(updateError),
        isError: true,
      });
    }
  }

  // 성공하면 결과를, 실패하면 null을 반환한다. (일괄 업데이트에서 재사용)
  async function updateArtistRow(
    artistId: string,
  ): Promise<SpotifyArtistUpdateResult | null> {
    setRowStatus(artistId, { isBusy: true, message: "업데이트 중..." });

    try {
      const result = await postJson<SpotifyArtistUpdateResult>(
        `/api/media/spotify-artists/${artistId}/update`,
      );
      setArtists((current) =>
        current.map((item) =>
          item.id === artistId
            ? {
                ...item,
                storedTrackCount:
                  item.storedTrackCount + result.linkedTrackCount,
                fetchedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setRowStatus(artistId, {
        isBusy: false,
        message: `앨범 ${result.albumCount}개 · 신규 트랙 ${result.newTrackCount}건 · 연결 ${result.linkedTrackCount}건 · API ${result.apiCallCount}회`,
      });

      return result;
    } catch (updateError) {
      setRowStatus(artistId, {
        isBusy: false,
        message: String(updateError),
        isError: true,
      });

      return null;
    }
  }

  return (
    <main className="max-w-7xl p-6 text-gray-950">
      <a
        className="cursor-pointer text-sm text-gray-600 underline"
        href="/admin"
      >
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">미디어</h1>
      <p className="mt-2 text-gray-600">
        media DB의 유튜브 채널/스포티파이 아티스트 데이터를 조회하고 외부 API로
        갱신합니다. 신규 항목만 증분 수집해 API 사용량을 아낍니다.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <TabButton
          isActive={tab === "youtube"}
          label="유튜브 채널"
          onClick={() => changeTab("youtube")}
        />
        <TabButton
          isActive={tab === "spotify"}
          label="스포티파이 아티스트"
          onClick={() => changeTab("spotify")}
        />
      </div>

      <section className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          검색
          <input
            className="w-64 border border-gray-300 px-3 py-2"
            onChange={(event) => setDraftSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(draftSearch.trim());
              }
            }}
            placeholder="이름 / ID"
            value={draftSearch}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          정렬
          <select
            className="border border-gray-300 px-3 py-2"
            onChange={(event) => setSortBy(event.target.value as SortBy)}
            value={sortBy}
          >
            <option value="popular">
              {tab === "youtube" ? "구독자순" : "팔로워순"}
            </option>
            <option value="fetchedAt">갱신 오래된순</option>
            <option value="name">이름순</option>
          </select>
        </label>
        <button
          className="cursor-pointer border border-gray-900 px-4 py-2 hover:bg-gray-100"
          onClick={() => setSearch(draftSearch.trim())}
          type="button"
        >
          검색
        </button>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
          <input
            checked={jpopOnly}
            className="h-4 w-4"
            onChange={(event) => setJpopOnly(event.target.checked)}
            type="checkbox"
          />
          JPOP 아티스트만
        </label>
        <span className="pb-2 text-sm text-gray-600">총 {total}건</span>
      </section>

      <section className="mt-4 flex flex-wrap items-center gap-3 border border-gray-300 bg-gray-50 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            checked={
              tab === "youtube"
                ? channels.length > 0 && selectedIds.size === channels.length
                : artists.length > 0 && selectedIds.size === artists.length
            }
            className="h-4 w-4"
            onChange={toggleSelectAll}
            type="checkbox"
          />
          전체선택
        </label>
        <button
          className="cursor-pointer border border-gray-900 px-4 py-2 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selectedIds.size === 0 || isBulkRunning}
          onClick={() => void handleBulkUpdate()}
          type="button"
        >
          {tab === "youtube"
            ? `선택한 채널 업데이트 (${selectedIds.size}개)`
            : `선택한 아티스트 업데이트 (${selectedIds.size}명)`}
        </button>
        {bulkProgress ? (
          <span
            className={`text-sm ${
              isBulkRunning ? "text-gray-600" : "text-emerald-700"
            }`}
          >
            {isBulkRunning
              ? `진행 중 ${bulkProgress.done}/${bulkProgress.total}`
              : `완료 ${bulkProgress.done}/${bulkProgress.total}`}
            {" · "}
            {tab === "youtube" ? "신규 영상" : "신규 트랙"}{" "}
            {bulkProgress.newItemCount}건 · API {bulkProgress.apiCallCount}회
            {bulkProgress.failedCount > 0
              ? ` · 실패 ${bulkProgress.failedCount}건`
              : ""}
          </span>
        ) : null}
      </section>

      {listError ? (
        <p className="mt-4 text-sm text-red-600">{listError}</p>
      ) : null}

      <section className="mt-4 grid gap-2">
        {tab === "youtube"
          ? channels.map((channel) => (
              <YoutubeChannelRow
                channel={channel}
                isSelected={selectedIds.has(channel.id)}
                key={channel.id}
                onStatsRefresh={() => void handleChannelStatsRefresh(channel)}
                onToggleSelected={() => toggleSelected(channel.id)}
                onUpdate={() => void updateChannelRow(channel.id)}
                status={rowStatuses[channel.id]}
              />
            ))
          : artists.map((artist) => (
              <SpotifyArtistRow
                artist={artist}
                isSelected={selectedIds.has(artist.id)}
                key={artist.id}
                onToggleSelected={() => toggleSelected(artist.id)}
                onUpdate={() => void updateArtistRow(artist.id)}
                status={rowStatuses[artist.id]}
              />
            ))}
      </section>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-600">로딩 중...</p>
      ) : null}

      {hasMore && !isLoading ? (
        <button
          className="mt-4 cursor-pointer border border-gray-900 px-4 py-2 hover:bg-gray-100"
          onClick={() => void loadMore()}
          type="button"
        >
          더 보기
        </button>
      ) : null}
    </main>
  );
}

function TabButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`cursor-pointer border px-4 py-2 ${
        isActive
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 hover:bg-gray-100"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function YoutubeChannelRow({
  channel,
  isSelected,
  onStatsRefresh,
  onToggleSelected,
  onUpdate,
  status,
}: {
  channel: YoutubeChannelItem;
  isSelected: boolean;
  onStatsRefresh: () => void;
  onToggleSelected: () => void;
  onUpdate: () => void;
  status?: RowStatus;
}) {
  return (
    <article className="flex flex-wrap items-center gap-4 border border-gray-200 p-3">
      <input
        checked={isSelected}
        className="h-4 w-4 cursor-pointer"
        onChange={onToggleSelected}
        type="checkbox"
      />
      {channel.thumbnail ? (
        <img
          alt=""
          className="h-12 w-12 rounded-full object-cover"
          src={channel.thumbnail}
        />
      ) : (
        <div className="h-12 w-12 rounded-full bg-gray-200" />
      )}
      <div className="min-w-0 flex-1">
        <a
          className="font-medium underline-offset-2 hover:underline"
          href={`https://www.youtube.com/channel/${channel.id}`}
          rel="noreferrer"
          target="_blank"
        >
          {channel.title ?? channel.id}
        </a>
        <p className="mt-0.5 text-sm text-gray-600">
          구독자 {formatCount(channel.subscriberCount)} · 영상{" "}
          {formatCount(channel.videoCount)} · 저장됨 {channel.storedVideoCount}
          건 · 갱신 {formatFetchedAt(channel.fetchedAt)}
        </p>
        {channel.artists.length > 0 ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-gray-500">아티스트</span>
            {channel.artists.map((artist) => (
              <a
                className="border border-gray-300 px-1.5 py-0.5 text-gray-800 underline-offset-2 hover:bg-gray-100 hover:underline"
                href={`/admin/song?artistId=${artist.id}`}
                key={artist.id}
              >
                {artist.name}
              </a>
            ))}
          </p>
        ) : null}
        {status?.message ? (
          <p
            className={`mt-0.5 text-sm ${
              status.isError ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button
          className="cursor-pointer border border-gray-900 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={status?.isBusy}
          onClick={onUpdate}
          title="채널 정보 갱신 + 신규 영상 증분 수집"
          type="button"
        >
          업데이트
        </button>
        <button
          className="cursor-pointer border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={status?.isBusy || channel.storedVideoCount === 0}
          onClick={onStatsRefresh}
          title="저장된 전체 영상의 조회수/좋아요 통계 갱신"
          type="button"
        >
          통계 갱신
        </button>
      </div>
    </article>
  );
}

function SpotifyArtistRow({
  artist,
  isSelected,
  onToggleSelected,
  onUpdate,
  status,
}: {
  artist: SpotifyArtistItem;
  isSelected: boolean;
  onToggleSelected: () => void;
  onUpdate: () => void;
  status?: RowStatus;
}) {
  return (
    <article className="flex flex-wrap items-center gap-4 border border-gray-200 p-3">
      <input
        checked={isSelected}
        className="h-4 w-4 cursor-pointer"
        onChange={onToggleSelected}
        type="checkbox"
      />
      {artist.image ? (
        <img
          alt=""
          className="h-12 w-12 rounded-full object-cover"
          src={artist.image}
        />
      ) : (
        <div className="h-12 w-12 rounded-full bg-gray-200" />
      )}
      <div className="min-w-0 flex-1">
        <a
          className="font-medium underline-offset-2 hover:underline"
          href={`https://open.spotify.com/artist/${artist.id}`}
          rel="noreferrer"
          target="_blank"
        >
          {artist.name}
        </a>
        <p className="mt-0.5 text-sm text-gray-600">
          팔로워 {formatCount(artist.followers)} · 인기도{" "}
          {artist.popularity ?? "-"} · 저장된 트랙 {artist.storedTrackCount}건 ·
          갱신 {formatFetchedAt(artist.fetchedAt)}
        </p>
        {artist.artists.length > 0 ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-gray-500">아티스트</span>
            {artist.artists.map((linkedArtist) => (
              <a
                className="border border-gray-300 px-1.5 py-0.5 text-gray-800 underline-offset-2 hover:bg-gray-100 hover:underline"
                href={`/admin/song?artistId=${linkedArtist.id}`}
                key={linkedArtist.id}
              >
                {linkedArtist.name}
              </a>
            ))}
          </p>
        ) : null}
        {status?.message ? (
          <p
            className={`mt-0.5 text-sm ${
              status.isError ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </div>
      <button
        className="cursor-pointer border border-gray-900 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={status?.isBusy}
        onClick={onUpdate}
        title="아티스트 정보 갱신 + 신규 트랙 수집"
        type="button"
      >
        업데이트
      </button>
    </article>
  );
}

function formatCount(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  if (parsed >= 100_000_000) {
    return `${(parsed / 100_000_000).toFixed(1)}억`;
  }

  if (parsed >= 10_000) {
    return `${(parsed / 10_000).toFixed(1)}만`;
  }

  return parsed.toLocaleString();
}

function formatFetchedAt(value?: string): string {
  if (!value) {
    return "안 됨";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "안 됨";
  }

  return date.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchYoutubeChannels(
  search: string,
  sortBy: SortBy,
  jpopOnly: boolean,
  offset: number,
): Promise<MediaListResponse<YoutubeChannelItem>> {
  return fetchList(
    "/api/media/youtube-channels",
    search,
    sortBy,
    jpopOnly,
    offset,
  );
}

async function fetchSpotifyArtists(
  search: string,
  sortBy: SortBy,
  jpopOnly: boolean,
  offset: number,
): Promise<MediaListResponse<SpotifyArtistItem>> {
  return fetchList(
    "/api/media/spotify-artists",
    search,
    sortBy,
    jpopOnly,
    offset,
  );
}

async function fetchList<Item>(
  path: string,
  search: string,
  sortBy: SortBy,
  jpopOnly: boolean,
  offset: number,
): Promise<MediaListResponse<Item>> {
  const params = new URLSearchParams({
    sortBy,
    offset: String(offset),
    limit: String(jpopOnly ? jpopPageSize : pageSize),
  });

  if (search) {
    params.set("search", search);
  }

  if (jpopOnly) {
    params.set("jpopOnly", "true");
  }

  const response = await fetch(`${path}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as MediaListResponse<Item>;
}

async function postJson<Result>(path: string): Promise<Result> {
  const response = await fetch(path, { method: "POST" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed: ${response.status} ${body}`);
  }

  return (await response.json()) as Result;
}

function parseTabFromUrl(): MediaTab {
  const tab = new URLSearchParams(window.location.search).get("tab");

  return tab === "spotify" ? "spotify" : "youtube";
}

function writeTabToUrl(tab: MediaTab) {
  const url = new URL(window.location.href);

  url.searchParams.set("tab", tab);
  window.history.replaceState(null, "", url.toString());
}
