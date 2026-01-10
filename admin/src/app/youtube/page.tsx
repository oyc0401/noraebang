"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  deleteYoutubeChannel,
  getYoutubeArtists,
  getYoutubeSongsByArtist,
  upsertYoutubeChannel,
} from "./actions";

type Artist = Awaited<ReturnType<typeof getYoutubeArtists>>[number];
type YoutubeChannel = Artist["youtubeChannels"][number];
type ChannelType = YoutubeChannel["type"];
type ArtistSong = Awaited<ReturnType<typeof getYoutubeSongsByArtist>>[number];

type FilterState = {
  main: "all" | "has" | "missing";
  topic: "all" | "has" | "missing";
  count: "all" | "0" | "1" | "2";
  sort: "name" | "nameKo" | "updatedAt" | "channelCount" | "id";
  videoCountEnabled: boolean;
  maxVideoCount: number;
  subscriberCountEnabled: boolean;
  maxSubscriberCount: number;
};

const DEFAULT_FILTERS: FilterState = {
  main: "all",
  topic: "all",
  count: "all",
  sort: "id",
  videoCountEnabled: false,
  maxVideoCount: 0,
  subscriberCountEnabled: false,
  maxSubscriberCount: 0,
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

const VISIBLE_INCREMENT = 40;

export default function YoutubeAdminPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(
    () => {
      if (typeof window === "undefined") return null;
      const hash = window.location.hash.replace("#", "");
      const hashId = Number(hash);
      return !Number.isNaN(hashId) && hashId > 0 ? hashId : null;
    },
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(VISIBLE_INCREMENT);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [artistSongs, setArtistSongs] = useState<ArtistSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [showSongs, setShowSongs] = useState(false);

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

  useEffect(() => {
    setVisibleCount(VISIBLE_INCREMENT);
  }, [filters, searchQuery, artists.length]);

  const filteredArtists = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
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

      if (filters.videoCountEnabled) {
        const hasChannelWithLowVideoCount = artist.youtubeChannels.some(
          (channel) =>
            channel.videoCount !== undefined &&
            channel.videoCount <= filters.maxVideoCount,
        );
        if (!hasChannelWithLowVideoCount) return false;
      }

      if (filters.subscriberCountEnabled) {
        const hasChannelWithLowSubscriberCount = artist.youtubeChannels.some(
          (channel) =>
            channel.subscriberCount !== undefined &&
            channel.subscriberCount <= filters.maxSubscriberCount,
        );
        if (!hasChannelWithLowSubscriberCount) return false;
      }

      if (normalizedQuery.length > 0) {
        const haystack = [artist.name, artist.nameKo, artist.slug ?? ""]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [artists, filters, searchQuery]);

  const sortedArtists = useMemo(() => {
    const sorted = [...filteredArtists];
    sorted.sort((a, b) => {
      switch (filters.sort) {
        case "name": {
          return a.name.localeCompare(b.name, "ko");
        }
        case "nameKo": {
          return a.nameKo.localeCompare(b.nameKo, "ko");
        }
        case "updatedAt": {
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }
        case "channelCount": {
          return b.youtubeChannels.length - a.youtubeChannels.length;
        }
        case "id": {
          return a.id - b.id;
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredArtists, filters.sort]);

  const visibleArtists = useMemo(
    () => sortedArtists.slice(0, visibleCount),
    [sortedArtists, visibleCount],
  );

  const totalArtists = sortedArtists.length;

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
    if (!selectedArtistId) return;
    const index = sortedArtists.findIndex(
      (artist) => artist.id === selectedArtistId,
    );
    if (index >= 0 && index >= visibleCount) {
      setVisibleCount((prev) => Math.max(prev, index + 1));
    }
  }, [sortedArtists, selectedArtistId, visibleCount]);

  useEffect(() => {
    if (!initialSelectionResolved.current) return;
    if (!sortedArtists.length) {
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

    setSelectedArtistId(sortedArtists[0]?.id ?? null);
  }, [sortedArtists, selectedArtistId, artists]);

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

  const handleListScroll = useCallback(() => {
    const container = listContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      setVisibleCount((prev) => {
        if (prev >= totalArtists) return prev;
        return Math.min(totalArtists, prev + VISIBLE_INCREMENT);
      });
    }
  }, [totalArtists]);

  const selectedArtist = artists.find(
    (artist) => artist.id === selectedArtistId,
  );
  const youtubeMusicSearchQuery =
    selectedArtist?.name?.trim() || selectedArtist?.nameKo?.trim() || "";
  const youtubeMusicSearchUrl = youtubeMusicSearchQuery
    ? `https://music.youtube.com/search?q=${encodeURIComponent(
        youtubeMusicSearchQuery,
      )}`
    : null;
  const youtubeSearchUrl = youtubeMusicSearchQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
        youtubeMusicSearchQuery,
      )}&sp=EgIQAg%253D%253D` // 필터: 채널
    : null;

  useEffect(() => {
    if (!selectedArtistId || !showSongs) {
      setArtistSongs([]);
      setSongsError(null);
      setSongsLoading(false);
      return;
    }

    let cancelled = false;
    setSongsLoading(true);
    setSongsError(null);

    getYoutubeSongsByArtist(selectedArtistId)
      .then((songs) => {
        if (cancelled) return;
        setArtistSongs(songs);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "곡 정보를 불러오지 못했습니다.";
        setSongsError(message);
        setArtistSongs([]);
      })
      .finally(() => {
        if (cancelled) return;
        setSongsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArtistId, showSongs]);

  const moveSelection = useCallback(
    (direction: "prev" | "next") => {
      if (!sortedArtists.length) return;

      if (!selectedArtistId) {
        setSelectedArtistId(sortedArtists[0].id);
        return;
      }

      const currentIndex = sortedArtists.findIndex(
        (artist) => artist.id === selectedArtistId,
      );

      if (currentIndex === -1) {
        setSelectedArtistId(sortedArtists[0].id);
        return;
      }

      if (direction === "prev" && currentIndex > 0) {
        setSelectedArtistId(sortedArtists[currentIndex - 1].id);
      } else if (
        direction === "next" &&
        currentIndex < sortedArtists.length - 1
      ) {
        setSelectedArtistId(sortedArtists[currentIndex + 1].id);
      }
    },
    [sortedArtists, selectedArtistId],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "ArrowUp" &&
        event.key !== "ArrowDown" &&
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight"
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelection("prev");
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveSelection]);

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
      await upsertYoutubeChannel(
        selectedArtist.id,
        dialogType,
        channelUrlInput,
      );
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
      <div className="mx-auto w-full max-w-[1600px] px-3 py-8 sm:px-4 lg:px-6">
        <header className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
              aria-label="관리자 대시보드로 돌아가기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-red-500">
                YouTube
              </p>
              <h1 className="text-3xl font-bold text-zinc-900">
                유튜브 채널 관리
              </h1>
            </div>
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

        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[420px_minmax(0,1.0625fr)_360px] xl:items-start">
          <aside className="flex w-full flex-shrink-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm xl:h-[calc(100vh-6rem)]">
            <div className="flex-shrink-0 relative">
              <button
                ref={filterButtonRef}
                type="button"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                style={{ cursor: "pointer" }}
              >
                필터
              </button>

              {filterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setFilterDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-lg z-20">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-semibold text-zinc-700">
                          메인
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, main: "all" }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.main === "all" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            전체
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, main: "has" }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.main === "has" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            있음
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                main: "missing",
                              }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.main === "missing" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            없음
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold text-zinc-700">
                          토픽
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, topic: "all" }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.topic === "all" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            전체
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, topic: "has" }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.topic === "has" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            있음
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                topic: "missing",
                              }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.topic === "missing" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            없음
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold text-zinc-700">
                          채널 개수
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, count: "all" }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.count === "all" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            전체
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, count: "0" }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.count === "0" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            0개
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, count: "1" }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.count === "1" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            1개
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({ ...prev, count: "2" }))
                            }
                            className={`rounded px-3 py-1 text-xs ${filters.count === "2" ? "bg-red-100 text-red-700 font-semibold" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            style={{ cursor: "pointer" }}
                          >
                            2개
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-zinc-700">
                            동영상 개수 필터
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                videoCountEnabled: !prev.videoCountEnabled,
                              }))
                            }
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              filters.videoCountEnabled
                                ? "bg-blue-100 text-blue-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                            style={{ cursor: "pointer" }}
                          >
                            {filters.videoCountEnabled ? "ON" : "OFF"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={filters.maxVideoCount}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                maxVideoCount: Number(e.target.value),
                              }))
                            }
                            disabled={!filters.videoCountEnabled}
                            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs disabled:bg-zinc-50 disabled:text-zinc-400"
                            placeholder="동영상 개수"
                          />
                          <span className="text-xs text-zinc-500">개 이하</span>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-zinc-700">
                            구독자 수 필터
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                subscriberCountEnabled:
                                  !prev.subscriberCountEnabled,
                              }))
                            }
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              filters.subscriberCountEnabled
                                ? "bg-blue-100 text-blue-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                            style={{ cursor: "pointer" }}
                          >
                            {filters.subscriberCountEnabled ? "ON" : "OFF"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={filters.maxSubscriberCount}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                maxSubscriberCount: Number(e.target.value),
                              }))
                            }
                            disabled={!filters.subscriberCountEnabled}
                            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs disabled:bg-zinc-50 disabled:text-zinc-400"
                            placeholder="구독자 수"
                          />
                          <span className="text-xs text-zinc-500">명 이하</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    아티스트 목록
                  </p>
                  <span className="text-xs text-zinc-500">
                    {filteredArtists.length}명
                  </span>
                </div>
                <div className="relative hidden md:block">
                  <select
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 md:w-48"
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        sort: event.target.value as FilterState["sort"],
                      }))
                    }
                  >
                    <option value="name">이름 (로마자)</option>
                    <option value="nameKo">이름 (한글)</option>
                    <option value="id">아티스트 ID</option>
                    <option value="channelCount">채널 개수</option>
                    <option value="updatedAt">최근 수정 순</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <select
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 md:hidden"
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        sort: event.target.value as FilterState["sort"],
                      }))
                    }
                  >
                    <option value="name">이름 (로마자)</option>
                    <option value="nameKo">이름 (한글)</option>
                    <option value="id">아티스트 ID</option>
                    <option value="channelCount">채널 개수</option>
                    <option value="updatedAt">최근 수정 순</option>
                  </select>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="이름, 한글명 또는 별칭 검색"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                      aria-label="검색어 지우기"
                      onClick={() => setSearchQuery("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div
              className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
              ref={listContainerRef}
              onScroll={handleListScroll}
            >
              {artistsLoading ? (
                <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500">
                  아티스트를 불러오는 중입니다...
                </p>
              ) : filteredArtists.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-400">
                  조건에 맞는 아티스트가 없습니다.
                </p>
              ) : (
                visibleArtists.map((artist) => {
                  const selected = artist.id === selectedArtistId;
                  const channelCount = artist.youtubeChannels.length;
                  const hasMain = artist.youtubeChannels.some(
                    (channel) => channel.type === "MAIN",
                  );
                  const hasTopic = artist.youtubeChannels.some(
                    (channel) => channel.type === "TOPIC",
                  );
                  const mainChannel = artist.youtubeChannels.find(
                    (channel) => channel.type === "MAIN",
                  );
                  const topicChannel = artist.youtubeChannels.find(
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
                      <div className="flex items-start gap-3">
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
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-base font-semibold text-zinc-900">
                                {artist.name}
                              </p>
                              <p className="text-sm text-zinc-500">
                                {artist.nameKo}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-zinc-600">
                                ID: {artist.id}
                              </span>
                              <div className="flex gap-1 justify-end">
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

                          <div className="space-y-2">
                            {mainChannel && (
                              <div className="rounded-xl bg-white/70 p-2">
                                <div className="flex items-start gap-2">
                                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                                    {mainChannel.thumbnailDefault ? (
                                      <Image
                                        src={mainChannel.thumbnailDefault}
                                        alt="메인 채널"
                                        fill
                                        className="object-cover"
                                        sizes="40px"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-[8px] text-zinc-400">
                                        NO
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-md font-medium text-zinc-900">
                                      {mainChannel.title}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500">
                                      Main
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                                      <span>
                                        구독자{" "}
                                        {formatNumber(
                                          mainChannel.subscriberCount,
                                        )}
                                      </span>
                                      <span>·</span>
                                      <span>
                                        동영상{" "}
                                        {formatNumber(mainChannel.videoCount)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {topicChannel && (
                              <div className="rounded-xl bg-white/70 p-2">
                                <div className="flex items-start gap-2">
                                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                                    {topicChannel.thumbnailDefault ? (
                                      <Image
                                        src={topicChannel.thumbnailDefault}
                                        alt="토픽 채널"
                                        fill
                                        className="object-cover"
                                        sizes="40px"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-[8px] text-zinc-400">
                                        NO
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-md font-medium text-zinc-900">
                                      {topicChannel.title}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                                      Topic
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                                      <span>
                                        구독자{" "}
                                        {formatNumber(
                                          topicChannel.subscriberCount,
                                        )}
                                      </span>
                                      <span>·</span>
                                      <span>
                                        동영상{" "}
                                        {formatNumber(topicChannel.videoCount)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400">
                            총 채널 {channelCount}개
                          </p>
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
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap gap-2">
                      {youtubeSearchUrl && (
                        <a
                          href={youtubeSearchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-red-300 hover:text-red-600"
                        >
                          유튜브 이동
                        </a>
                      )}
                      {youtubeMusicSearchUrl && (
                        <a
                          href={youtubeMusicSearchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-red-300 hover:text-red-600"
                        >
                          유튜브뮤직 이동
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openDialog("MAIN")}
                        className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-700"
                      >
                        메인 채널 수정
                      </button>
                      <button
                        type="button"
                        onClick={() => openDialog("TOPIC")}
                        className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-600"
                      >
                        토픽 채널 수정
                      </button>
                    </div>
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
                      아직 등록된 채널이 없습니다. 아래 버튼으로 바로 추가해
                      주세요.
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

          <section className="flex w-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm xl:h-[calc(100vh-6rem)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">연결된 곡</p>
                <p className="text-xs text-zinc-500">
                  {selectedArtist
                    ? `${artistSongs.length.toLocaleString("ko-KR")}곡이 연결되어 있습니다.`
                    : "아티스트를 선택하면 곡 목록을 확인할 수 있습니다."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSongs(!showSongs)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    showSongs
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  {showSongs ? "OFF" : "ON"}
                </button>
                {selectedArtist && (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    ID {selectedArtist.id}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 min-h-[200px] flex-1 overflow-y-auto pr-1">
              {!selectedArtist ? (
                <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4 text-center text-sm text-zinc-500">
                  왼쪽에서 아티스트를 선택해 곡을 확인하세요.
                </p>
              ) : songsLoading ? (
                <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500">
                  곡 정보를 불러오는 중입니다...
                </p>
              ) : songsError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
                  {songsError}
                </p>
              ) : artistSongs.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4 text-center text-sm text-zinc-500">
                  연결된 곡이 없습니다.
                </p>
              ) : (
                <ul className="space-y-3">
                  {artistSongs.map((song) => (
                    <li
                      key={song.id}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {song.title}
                          </p>
                          {song.titleKo && (
                            <p className="text-xs text-zinc-500">
                              {song.titleKo}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-400">
                          #{song.id}
                        </span>
                      </div>

                      {song.owners.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {song.owners.map((owner) => (
                            <span
                              key={`${song.id}-owner-${owner.id}`}
                              className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                            >
                              {owner.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1">
                        {song.karaokeSongs.length > 0 ? (
                          song.karaokeSongs.map((karaoke) => (
                            <span
                              key={`${song.id}-${karaoke.provider}-${karaoke.karaokeNo ?? "na"}`}
                              className="rounded-full bg-zinc-900/5 px-2 py-0.5 text-[11px] font-semibold text-zinc-600"
                            >
                              {karaoke.provider} {karaoke.karaokeNo ?? "-"}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-zinc-400">
                            노래방 번호 없음
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
                  채널 페이지의 주소를 붙여넣거나 채널 ID(UC로 시작)를
                  입력하세요.
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
    </div>
  );
}
