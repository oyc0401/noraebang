"use client";

import Image from "next/image";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  deleteYoutubeChannel,
  getYoutubeArtists,
  upsertYoutubeChannel,
} from "./actions";

type Artist = Awaited<ReturnType<typeof getYoutubeArtists>>[number];
type YoutubeChannel = Artist["youtubeChannels"][number];
type ChannelType = YoutubeChannel["type"];

type FilterState = {
  main: "all" | "has" | "missing";
  topic: "all" | "has" | "missing";
  count: "all" | "0" | "1" | "2";
};

const DEFAULT_FILTERS: FilterState = {
  main: "all",
  topic: "all",
  count: "all",
};

const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  MAIN: "메인 유튜브",
  TOPIC: "토픽 유튜브",
};

const CHANNEL_BADGE_CLASS: Record<ChannelType, string> = {
  MAIN: "bg-red-100 text-red-700",
  TOPIC: "bg-amber-100 text-amber-700",
};

const CHANNEL_TYPE_DESCRIPTION: Record<ChannelType, string> = {
  MAIN: "공식 채널",
  TOPIC: "자동 생성 채널",
};

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return "비공개";
  return value.toLocaleString("ko-KR");
};

export default function YoutubeAdminPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.replace("#", "");
    const hashId = Number(hash);
    return !Number.isNaN(hashId) && hashId > 0 ? hashId : null;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<ChannelType>("MAIN");
  const [channelUrlInput, setChannelUrlInput] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [savingChannel, setSavingChannel] = useState(false);
  const [deletingType, setDeletingType] = useState<ChannelType | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const initialSelectionResolved = useRef(false);

  const loadArtists = useCallback(
    async (options?: { background?: boolean }) => {
      const runInBackground = options?.background ?? false;
      if (runInBackground) setRefreshing(true);
      else setArtistsLoading(true);

      try {
        const data = await getYoutubeArtists();
        setArtists(data);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "아티스트 정보를 불러오지 못했습니다.";
        setBanner({ type: "error", message });
      } finally {
        if (runInBackground) setRefreshing(false);
        else setArtistsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  const filteredArtists = useMemo(() => {
    return artists.filter((artist) => {
      const channelCount = artist.youtubeChannels.length;
      const hasMain = artist.youtubeChannels.some(
        (channel) => channel.type === "MAIN",
      );
      const hasTopic = artist.youtubeChannels.some(
        (channel) => channel.type === "TOPIC",
      );

      if (filters.main === "has" && !hasMain) return false;
      if (filters.main === "missing" && hasMain) return false;

      if (filters.topic === "has" && !hasTopic) return false;
      if (filters.topic === "missing" && hasTopic) return false;

      if (filters.count === "0" && channelCount !== 0) return false;
      if (filters.count === "1" && channelCount !== 1) return false;
      if (filters.count === "2" && channelCount !== 2) return false;

      return true;
    });
  }, [artists, filters]);

  useEffect(() => {
    if (!artists.length || initialSelectionResolved.current) return;
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace("#", "");
    const hashId = Number(hash);

    if (!Number.isNaN(hashId)) {
      const matched = artists.find((artist) => artist.id === hashId);
      if (matched) {
        setSelectedArtistId(matched.id);
        initialSelectionResolved.current = true;
        return;
      }
    }

    initialSelectionResolved.current = true;
  }, [artists]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleHashChange = () => {
      const hashValue = window.location.hash.replace("#", "");
      const hashId = Number(hashValue);
      if (Number.isNaN(hashId)) return;
      const exists = artists.some((artist) => artist.id === hashId);
      if (exists) {
        setSelectedArtistId(hashId);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [artists]);

  useEffect(() => {
    if (!initialSelectionResolved.current) return;
    if (!filteredArtists.length) {
      setSelectedArtistId(null);
      return;
    }

    // 현재 선택된 아티스트가 전체 목록에 있으면 유지 (필터 무시)
    if (
      selectedArtistId &&
      artists.some((artist) => artist.id === selectedArtistId)
    ) {
      return;
    }

    setSelectedArtistId(filteredArtists[0]?.id ?? null);
  }, [filteredArtists, selectedArtistId, artists]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedArtistId) {
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    window.history.replaceState(null, "", `#${selectedArtistId}`);

    const element = document.getElementById(`artist-${selectedArtistId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedArtistId]);

  const selectedArtist = artists.find(
    (artist) => artist.id === selectedArtistId,
  );

  const handleDeleteChannel = async (type: ChannelType) => {
    if (!selectedArtist) return;
    const confirmMessage = `'${selectedArtist.name}'의 ${
      CHANNEL_TYPE_LABELS[type]
    } 정보를 삭제할까요?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeletingType(type);
    setBanner(null);
    try {
      await deleteYoutubeChannel(selectedArtist.id, type);
      await loadArtists({ background: true });
      setBanner({
        type: "success",
        message: "YouTube 채널이 삭제되었습니다.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "YouTube 채널을 삭제하지 못했습니다.";
      setBanner({ type: "error", message });
    } finally {
      setDeletingType(null);
    }
  };

  const openDialog = (type: ChannelType) => {
    setDialogType(type);
    setChannelUrlInput("");
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedArtist) return;

    setSavingChannel(true);
    setDialogError(null);

    try {
      await upsertYoutubeChannel(selectedArtist.id, dialogType, channelUrlInput);
      await loadArtists({ background: true });
      setBanner({
        type: "success",
        message: "YouTube 채널 정보가 저장되었습니다.",
      });
      setDialogOpen(false);
      setChannelUrlInput("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "YouTube 채널을 등록하지 못했습니다.";
      setDialogError(message);
    } finally {
      setSavingChannel(false);
    }
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-red-500">
              YouTube
            </p>
            <h1 className="text-3xl font-bold text-zinc-900">
              유튜브 채널 관리
            </h1>
          </div>
          <p className="text-sm text-zinc-600">
            아티스트별 메인/토픽 채널을 등록하고 구독자 수, 채널 정보를 한눈에
            확인하세요.
          </p>
        </header>

        {banner && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              banner.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p>{banner.message}</p>
              <button
                type="button"
                className="text-xs text-zinc-500 hover:text-zinc-800"
                onClick={() => setBanner(null)}
              >
                닫기
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full flex-shrink-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex lg:h-[calc(100vh-8rem)] lg:w-[360px] lg:flex-col">
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => setFilterDialogOpen(true)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                style={{ cursor: "pointer" }}
              >
                필터 설정
              </button>
            </div>

            <div className="mt-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">
                  아티스트 목록
                </p>
                <span className="text-xs text-zinc-500">
                  {filteredArtists.length}명
                </span>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {artistsLoading ? (
                <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500">
                  아티스트를 불러오는 중입니다...
                </p>
              ) : filteredArtists.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-400">
                  조건에 맞는 아티스트가 없습니다.
                </p>
              ) : (
                filteredArtists.map((artist) => {
                  const selected = artist.id === selectedArtistId;
                  const channelCount = artist.youtubeChannels.length;
                  const hasMain = artist.youtubeChannels.some(
                    (channel) => channel.type === "MAIN",
                  );
                  const hasTopic = artist.youtubeChannels.some(
                    (channel) => channel.type === "TOPIC",
                  );

                  return (
                    <button
                      key={artist.id}
                      id={`artist-${artist.id}`}
                      type="button"
                      onClick={() => setSelectedArtistId(artist.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                        selected
                          ? "border-red-400 bg-red-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-zinc-100">
                          {artist.thumbnailMedium ? (
                            <Image
                              src={artist.thumbnailMedium}
                              alt={`${artist.name} 썸네일`}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                              NO IMG
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-zinc-900">
                            {artist.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {artist.nameKo}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-semibold text-zinc-600">
                            {channelCount}개
                          </span>
                          <div className="flex gap-1">
                            {hasMain && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                                메인
                              </span>
                            )}
                            {hasTopic && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                토픽
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex-1 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            {selectedArtist ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-zinc-100">
                      {selectedArtist.thumbnailHigh ? (
                        <Image
                          src={selectedArtist.thumbnailHigh}
                          alt={`${selectedArtist.name} 썸네일`}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                          NO IMG
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-zinc-900">
                        {selectedArtist.name}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {selectedArtist.nameKo}
                      </p>
                      <div className="mt-2 flex gap-2 text-xs text-zinc-500">
                        <span>
                          총 {selectedArtist.youtubeChannels.length}개의 채널
                        </span>
                        <span>•</span>
                        <span>
                          메인{" "}
                          {selectedArtist.youtubeChannels.some(
                            (channel) => channel.type === "MAIN",
                          )
                            ? "연동됨"
                            : "미연동"}
                        </span>
                        <span>•</span>
                        <span>
                          토픽{" "}
                          {selectedArtist.youtubeChannels.some(
                            (channel) => channel.type === "TOPIC",
                          )
                            ? "확인됨"
                            : "없음"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => openDialog("MAIN")}
                      className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
                    >
                      유튜브채널 설정하기
                    </button>
                    {refreshing && (
                      <span className="text-xs text-zinc-400">
                        최신 데이터를 불러오는 중...
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
                  <p className="text-sm font-semibold text-zinc-900">
                    등록된 YouTube 채널
                  </p>
                  {selectedArtist.youtubeChannels.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">
                      아직 등록된 채널이 없습니다.{" "}
                      <button
                        type="button"
                        className="font-semibold text-red-600 underline underline-offset-2"
                        onClick={() => openDialog("MAIN")}
                      >
                        유튜브채널 설정하기
                      </button>{" "}
                      버튼을 눌러 채널을 추가하세요.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-4">
                      {selectedArtist.youtubeChannels.map((channel) => (
                        <article
                          key={channel.id}
                          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 md:flex-row">
                            <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                              {channel.thumbnailHigh ? (
                                <Image
                                  src={channel.thumbnailHigh}
                                  alt={`${channel.title ?? "유튜브 채널"} 썸네일`}
                                  fill
                                  className="object-cover"
                                  sizes="112px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                                  NO IMG
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-lg font-semibold text-zinc-900">
                                      {channel.title ?? "제목 미상"}
                                    </p>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHANNEL_BADGE_CLASS[channel.type]}`}
                                    >
                                      {CHANNEL_TYPE_LABELS[channel.type]}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500">
                                    {CHANNEL_TYPE_DESCRIPTION[channel.type]}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <a
                                    href={`https://www.youtube.com/channel/${channel.channelId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-red-300 hover:text-red-600"
                                  >
                                    유튜브채널 바로가기
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => openDialog(channel.type)}
                                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                                  >
                                    수정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteChannel(channel.type)
                                    }
                                    disabled={deletingType === channel.type}
                                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {deletingType === channel.type
                                      ? "삭제 중..."
                                      : "삭제"}
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-6 text-sm text-zinc-600">
                                <p>
                                  구독자{" "}
                                  <span className="font-semibold text-zinc-900">
                                    {formatNumber(channel.subscriberCount)}
                                  </span>
                                </p>
                                <p>
                                  동영상{" "}
                                  <span className="font-semibold text-zinc-900">
                                    {formatNumber(channel.videoCount)}
                                  </span>
                                </p>
                                <p>
                                  Handle{" "}
                                  <span className="font-mono text-xs text-zinc-500">
                                    {channel.customUrl ?? "미등록"}
                                  </span>
                                </p>
                                <p>
                                  채널 ID{" "}
                                  <span className="font-mono text-xs text-zinc-500">
                                    {channel.channelId}
                                  </span>
                                </p>
                              </div>

                              {channel.description && (
                                <p className="mt-4 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-600">
                                  {channel.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center">
                <p className="text-lg font-semibold text-zinc-700">
                  왼쪽에서 아티스트를 선택해주세요.
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  필터를 조절해 원하는 조건의 아티스트를 찾을 수 있습니다.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {dialogOpen && selectedArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-red-500">
                  {selectedArtist.name}
                </p>
                <h2 className="text-xl font-bold text-zinc-900">
                  유튜브 채널 설정하기
                </h2>
                <p className="text-sm text-zinc-500">
                  채널 URL을 입력하면 YouTube API를 통해 정보를 자동으로
                  가져옵니다.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                onClick={() => setDialogOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleDialogSubmit}>
              <div>
                <label
                  htmlFor="channelType"
                  className="text-sm font-semibold text-zinc-900"
                >
                  채널 종류
                </label>
                <select
                  id="channelType"
                  value={dialogType}
                  onChange={(event) =>
                    setDialogType(event.target.value as ChannelType)
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="MAIN">메인 유튜브</option>
                  <option value="TOPIC">토픽 유튜브</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="youtubeUrl"
                  className="text-sm font-semibold text-zinc-900"
                >
                  YouTube 채널 URL
                </label>
                <input
                  id="youtubeUrl"
                  type="url"
                  required
                  value={channelUrlInput}
                  onChange={(event) => setChannelUrlInput(event.target.value)}
                  placeholder="https://www.youtube.com/channel/UC..."
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  채널 페이지의 주소를 붙여넣거나 채널 ID(UC로 시작)를 입력하세요.
                </p>
              </div>

              {dialogError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {dialogError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={savingChannel}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingChannel ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filterDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">필터 설정</h2>
                <p className="text-sm text-zinc-500">
                  원하는 조건으로 아티스트를 필터링하세요.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                onClick={() => setFilterDialogOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="filter-main" className="mb-2 block text-sm font-semibold text-zinc-900">
                  메인 유튜브
                </label>
                <select
                  id="filter-main"
                  value={filters.main}
                  onChange={(e) => setFilters((prev) => ({ ...prev, main: e.target.value as FilterState["main"] }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  style={{ cursor: "pointer" }}
                >
                  <option value="all">전체</option>
                  <option value="has">있음</option>
                  <option value="missing">없음</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-topic" className="mb-2 block text-sm font-semibold text-zinc-900">
                  토픽 유튜브
                </label>
                <select
                  id="filter-topic"
                  value={filters.topic}
                  onChange={(e) => setFilters((prev) => ({ ...prev, topic: e.target.value as FilterState["topic"] }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  style={{ cursor: "pointer" }}
                >
                  <option value="all">전체</option>
                  <option value="has">있음</option>
                  <option value="missing">없음</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-count" className="mb-2 block text-sm font-semibold text-zinc-900">
                  채널 개수
                </label>
                <select
                  id="filter-count"
                  value={filters.count}
                  onChange={(e) => setFilters((prev) => ({ ...prev, count: e.target.value as FilterState["count"] }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  style={{ cursor: "pointer" }}
                >
                  <option value="all">전체</option>
                  <option value="0">0개</option>
                  <option value="1">1개</option>
                  <option value="2">2개</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setFilterDialogOpen(false);
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={() => setFilterDialogOpen(false)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
