/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
/** biome-ignore-all lint/correctness/noUnsafeFinally: <explanation> */
/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */
"use client";

import Link from "next/link";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  connectArtistToSong,
  deleteKaraokeNumber,
  disconnectArtistFromSong,
  getSongDetail,
  getSongs,
  searchArtists,
  deleteSong,
  updateSongTitles,
  upsertKaraokeNumber,
  updateSongThumbnails,
} from "./actions";

type SongListResponse = Awaited<ReturnType<typeof getSongs>>;
type SongListItem = SongListResponse["songs"][number];
type SongDetail = Awaited<ReturnType<typeof getSongDetail>>;
type ArtistSearchResult = Awaited<ReturnType<typeof searchArtists>>[number];
type Provider = "TJ" | "KY" | "JOYSOUND";
type PresenceFilter = "any" | "with" | "without";
type ProviderPresence = PresenceFilter;

const PROVIDERS: Provider[] = ["TJ", "KY", "JOYSOUND"];
const PROVIDER_LABELS: Record<Provider, string> = {
  TJ: "TJ",
  KY: "금영",
  JOYSOUND: "JOYSOUND",
};

const PRESENCE_OPTIONS: { value: PresenceFilter; label: string }[] = [
  { value: "any", label: "전체" },
  { value: "with", label: "있음" },
  { value: "without", label: "없음" },
];

const createEmptyPresence = (): Record<Provider, boolean> => ({
  TJ: false,
  KY: false,
  JOYSOUND: false,
});

const buildPresenceFromDetail = (detail: SongDetail) => {
  const map = createEmptyPresence();
  detail.karaokeSongs.forEach((ks) => {
    map[ks.provider as Provider] = true;
  });
  return map;
};

const pickThumbnailUrl = (
  source?: {
    thumbnailHigh?: string | null;
    thumbnailMedium?: string | null;
    thumbnailDefault?: string | null;
  } | null,
) =>
  source?.thumbnailHigh ||
  source?.thumbnailMedium ||
  source?.thumbnailDefault ||
  null;

const parseSongIdFromHash = () => {
  const hash = window.location.hash;
  if (!hash) return null;
  const id = Number.parseInt(hash.replace("#", ""), 10);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getHashSelection = () =>
  typeof window === "undefined" ? null : parseSongIdFromHash();

export default function AdminSongPage() {
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [hasMoreSongs, setHasMoreSongs] = useState(false);
  const [listCursor, setListCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [withoutArtistOnly, setWithoutArtistOnly] = useState(false);
  const [providerPresence, setProviderPresence] = useState<
    Record<Provider, ProviderPresence>
  >({
    TJ: "any",
    KY: "any",
    JOYSOUND: "any",
  });
  const [thumbnailPresenceFilter, setThumbnailPresenceFilter] =
    useState<PresenceFilter>("any");
  const [titleKoPresenceFilter, setTitleKoPresenceFilter] =
    useState<PresenceFilter>("any");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const selectedSongIdRef = useRef<number | null>(null);
  const [songDetail, setSongDetail] = useState<SongDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [titleKoInput, setTitleKoInput] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [showArtistDialog, setShowArtistDialog] = useState(false);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([]);
  const [artistSearching, setArtistSearching] = useState(false);
  const [artistError, setArtistError] = useState<string | null>(null);
  const [connectingArtistId, setConnectingArtistId] = useState<number | null>(
    null,
  );
  const [removingArtistId, setRemovingArtistId] = useState<number | null>(null);

  const [showKaraokeDialog, setShowKaraokeDialog] = useState(false);
  const [karaokeProvider, setKaraokeProvider] = useState<Provider | null>(null);
  const [karaokeInput, setKaraokeInput] = useState("");
  const [karaokeSaving, setKaraokeSaving] = useState(false);
  const [karaokeError, setKaraokeError] = useState<string | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(
    null,
  );
  const [songDeleting, setSongDeleting] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [showThumbnailDialog, setShowThumbnailDialog] = useState(false);
  const [thumbnailDefaultInput, setThumbnailDefaultInput] = useState("");
  const [thumbnailMediumInput, setThumbnailMediumInput] = useState("");
  const [thumbnailHighInput, setThumbnailHighInput] = useState("");
  const [thumbnailSaving, setThumbnailSaving] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchKeyword(searchValue.trim());
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchValue]);

  useEffect(() => {
    const applyHashSelection = () => {
      const idFromHash = getHashSelection();
      if (idFromHash && idFromHash !== selectedSongIdRef.current) {
        selectedSongIdRef.current = idFromHash;
        setSelectedSongId(idFromHash);
      }
    };

    applyHashSelection();
    window.addEventListener("hashchange", applyHashSelection);
    return () => window.removeEventListener("hashchange", applyHashSelection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(event.target as Node)
      ) {
        setFiltersOpen(false);
      }
    };
    if (filtersOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
    return undefined;
  }, [filtersOpen]);

  const fetchSongs = useCallback(
    async ({
      cursor,
      reset,
    }: {
      cursor?: number | null;
      reset?: boolean;
    } = {}) => {
      const isReset = reset ?? false;

      if (isReset) {
        setListLoading(true);
        setListError(null);
        setLoadMoreError(null);
        setDetailError(null);
        setHasMoreSongs(false);
        setListCursor(null);
        setSongs([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await getSongs({
          search: searchKeyword,
          withoutArtist: withoutArtistOnly,
          providerPresence,
          cursor: cursor ?? undefined,
          thumbnailPresence: thumbnailPresenceFilter,
          titleKoPresence: titleKoPresenceFilter,
        });

        setSongs((prev) => (isReset ? data.songs : [...prev, ...data.songs]));
        setListCursor(data.nextCursor ?? null);
        setHasMoreSongs(Boolean(data.nextCursor));

        if (isReset) {
          setListError(null);
          const hashSelection = getHashSelection();
          if (hashSelection) {
            selectedSongIdRef.current = hashSelection;
            setSelectedSongId(hashSelection);
          } else if (!selectedSongIdRef.current && data.songs.length) {
            setSelectedSongId(data.songs[0].id);
          }
        } else {
          setLoadMoreError(null);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "곡 목록을 불러오지 못했습니다.";
        if (isReset) {
          setListError(message);
        } else {
          setLoadMoreError(message);
        }
      } finally {
        if (isReset) {
          setListLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [
      providerPresence,
      searchKeyword,
      withoutArtistOnly,
      thumbnailPresenceFilter,
      titleKoPresenceFilter,
    ],
  );

  useEffect(() => {
    fetchSongs({ reset: true });
  }, [fetchSongs]);

  useEffect(() => {
    selectedSongIdRef.current = selectedSongId;
  }, [selectedSongId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const base = `${window.location.pathname}${window.location.search}`;
    if (selectedSongId) {
      window.history.replaceState(null, "", `${base}#${selectedSongId}`);
    } else {
      window.history.replaceState(null, "", base);
    }
  }, [selectedSongId]);

  useEffect(() => {
    if (!hasMoreSongs || listError) return;

    const container = listContainerRef.current;
    const trigger = loadMoreTriggerRef.current;
    if (!container || !trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.isIntersecting &&
          !loadingMore &&
          !listLoading &&
          listCursor
        ) {
          fetchSongs({ cursor: listCursor });
        }
      },
      {
        root: container,
        threshold: 0.4,
      },
    );

    observer.observe(trigger);

    return () => observer.disconnect();
  }, [
    fetchSongs,
    hasMoreSongs,
    listCursor,
    listError,
    listLoading,
    loadingMore,
  ]);

  useEffect(() => {
    if (!selectedSongId) {
      setSongDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    if (listLoading) return;

    let cancelled = false;

    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const detail = await getSongDetail(selectedSongId);
        if (cancelled) return;
        setSongDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSongDetail(null);
        setDetailError(
          error instanceof Error
            ? error.message
            : "곡 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (cancelled) return;
        setDetailLoading(false);
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedSongId, listLoading]);

  const handleProviderFilterChange = (
    provider: Provider,
    presence: ProviderPresence,
  ) => {
    setProviderPresence((prev) => ({
      ...prev,
      [provider]: presence,
    }));
  };

  const providerNumbers = useMemo(() => {
    const map: Record<Provider, string | null> = {
      TJ: null,
      KY: null,
      JOYSOUND: null,
    };

    if (!songDetail) return map;

    songDetail.karaokeSongs.forEach((ks) => {
      map[ks.provider as Provider] = ks.karaokeNo;
    });

    return map;
  }, [songDetail]);

  const detailMatchesFilters = useCallback(
    (
      detail: SongDetail,
      presenceOverride?: Record<Provider, boolean>,
    ): boolean => {
      const normalizedSearch = searchKeyword.trim().toLowerCase();
      if (normalizedSearch) {
        const titleMatches =
          detail.title.toLowerCase().includes(normalizedSearch) ||
          detail.titleKo?.toLowerCase().includes(normalizedSearch);
        if (!titleMatches) return false;
      }

      if (withoutArtistOnly && detail.artists.length > 0) {
        return false;
      }

      const presence = presenceOverride ?? buildPresenceFromDetail(detail);
      for (const provider of PROVIDERS) {
        const requirement = providerPresence[provider];
        if (!requirement || requirement === "any") continue;
        if (requirement === "with" && !presence[provider]) {
          return false;
        }
        if (requirement === "without" && presence[provider]) {
          return false;
        }
      }

      const hasThumbnail = Boolean(
        detail.thumbnailHigh ||
          detail.thumbnailMedium ||
          detail.thumbnailDefault,
      );
      if (thumbnailPresenceFilter === "with" && !hasThumbnail) return false;
      if (thumbnailPresenceFilter === "without" && hasThumbnail) return false;

      const hasTitleKo = Boolean(detail.titleKo);
      if (titleKoPresenceFilter === "with" && !hasTitleKo) return false;
      if (titleKoPresenceFilter === "without" && hasTitleKo) return false;

      return true;
    },
    [
      providerPresence,
      searchKeyword,
      withoutArtistOnly,
      thumbnailPresenceFilter,
      titleKoPresenceFilter,
    ],
  );

  const updateSongInList = useCallback(
    (detail: SongDetail) => {
      const presence = buildPresenceFromDetail(detail);
      const artistList = detail.artists.map((artist) => ({
        id: artist.artistId,
        name: artist.name,
        nameKo: artist.nameKo,
      }));
      let removedSelected = false;
      let fallbackId: number | null = null;

      setSongs((prev) => {
        const existingIndex = prev.findIndex((song) => song.id === detail.id);
        const matchesFilters = detailMatchesFilters(detail, presence);

        if (!matchesFilters) {
          if (existingIndex === -1) return prev;
          const next = [
            ...prev.slice(0, existingIndex),
            ...prev.slice(existingIndex + 1),
          ];

          if (selectedSongIdRef.current === detail.id) {
            removedSelected = true;
            const fallbackIndex = Math.min(existingIndex, next.length - 1);
            fallbackId = fallbackIndex >= 0 ? next[fallbackIndex].id : null;
          }

          return next;
        }

        const updatedEntry: SongListItem = {
          id: detail.id,
          title: detail.title,
          titleKo: detail.titleKo ?? undefined,
          thumbnailDefault: detail.thumbnailDefault ?? undefined,
          thumbnailMedium: detail.thumbnailMedium ?? undefined,
          thumbnailHigh: detail.thumbnailHigh ?? undefined,
          artists: artistList,
          karaokeProviders: presence,
        };

        if (existingIndex === -1) {
          return [...prev, updatedEntry].sort((a, b) => b.id - a.id);
        }

        const next = [...prev];
        next[existingIndex] = updatedEntry;
        return next;
      });

      if (removedSelected) {
        setSongDetail((current) =>
          current && current.id === detail.id ? null : current,
        );
        setSelectedSongId(fallbackId ?? null);
      }
    },
    [detailMatchesFilters],
  );

  const handleSongTitleSave = async () => {
    if (!songDetail) return;

    setTitleSaving(true);
    setTitleError(null);
    try {
      const updated = await updateSongTitles(
        songDetail.id,
        titleInput,
        titleKoInput || undefined,
      );
      setSongDetail(updated);
      updateSongInList(updated);
      setShowTitleDialog(false);
    } catch (error) {
      setTitleError(
        error instanceof Error ? error.message : "제목을 저장하지 못했습니다.",
      );
    } finally {
      setTitleSaving(false);
    }
  };

  const handleArtistSearch = async () => {
    if (!artistQuery.trim()) {
      setArtistResults([]);
      setArtistError("검색어를 입력하세요.");
      return;
    }

    setArtistSearching(true);
    setArtistError(null);
    try {
      const results = await searchArtists(artistQuery);
      setArtistResults(results);
    } catch (error) {
      setArtistError(
        error instanceof Error
          ? error.message
          : "아티스트를 검색하지 못했습니다.",
      );
    } finally {
      setArtistSearching(false);
    }
  };

  const handleArtistConnect = async (artistId: number) => {
    if (!songDetail) return;

    setConnectingArtistId(artistId);
    setArtistError(null);
    try {
      const updated = await connectArtistToSong(songDetail.id, artistId);
      setSongDetail(updated);
      updateSongInList(updated);
    } catch (error) {
      setArtistError(
        error instanceof Error
          ? error.message
          : "아티스트를 연결하지 못했습니다.",
      );
    } finally {
      setConnectingArtistId(null);
    }
  };

  const handleArtistRemove = async (artistId: number) => {
    if (!songDetail) return;
    const target = songDetail.artists.find(
      (artist) => artist.artistId === artistId,
    );
    const confirmed = window.confirm(
      target
        ? `${target.nameKo || target.name} 아티스트 연결을 해제할까요?`
        : "아티스트 연결을 해제할까요?",
    );
    if (!confirmed) return;

    setRemovingArtistId(artistId);
    setDetailError(null);
    try {
      const updated = await disconnectArtistFromSong(songDetail.id, artistId);
      setSongDetail(updated);
      updateSongInList(updated);
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "아티스트 연결을 해제하지 못했습니다.",
      );
    } finally {
      setRemovingArtistId(null);
    }
  };

  const openKaraokeDialog = (provider: Provider) => {
    if (!songDetail) return;

    const target = songDetail.karaokeSongs.find(
      (ks) => ks.provider === provider,
    );
    setKaraokeProvider(provider);
    setKaraokeInput(target?.karaokeNo ?? "");
    setKaraokeError(null);
    setShowKaraokeDialog(true);
  };

  const handleKaraokeSave = async () => {
    if (!songDetail || !karaokeProvider) return;

    setKaraokeSaving(true);
    setKaraokeError(null);
    try {
      const updated = await upsertKaraokeNumber(
        songDetail.id,
        karaokeProvider,
        karaokeInput,
      );
      setSongDetail(updated);
      updateSongInList(updated);
      setShowKaraokeDialog(false);
    } catch (error) {
      setKaraokeError(
        error instanceof Error
          ? error.message
          : "노래방 번호를 저장하지 못했습니다.",
      );
    } finally {
      setKaraokeSaving(false);
    }
  };

  const handleKaraokeDelete = async (provider: Provider) => {
    if (!songDetail) return;
    const label = PROVIDER_LABELS[provider];
    const confirmed = window.confirm(`${label} 노래방 번호를 정말 삭제할까요?`);
    if (!confirmed) return;

    setDeletingProvider(provider);
    setDetailError(null);
    try {
      const updated = await deleteKaraokeNumber(songDetail.id, provider);
      setSongDetail(updated);
      updateSongInList(updated);
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "노래방 번호를 삭제하지 못했습니다.",
      );
    } finally {
      setDeletingProvider(null);
    }
  };

  const handleSongDelete = async () => {
    if (!songDetail) return;
    const confirmed = window.confirm(
      "정말로 이 곡을 삭제할까요? 연결된 아티스트와 노래방 번호도 함께 삭제됩니다.",
    );
    if (!confirmed) return;

    setSongDeleting(true);
    setDetailError(null);
    try {
      await deleteSong(songDetail.id);
      let fallbackId: number | undefined;
      setSongs((prev) => {
        const idx = prev.findIndex((song) => song.id === songDetail.id);
        if (idx === -1) return prev;
        const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        fallbackId = next[Math.min(idx, next.length - 1)]?.id ?? null;
        return next;
      });
      setSongDetail(null);
      if (fallbackId !== undefined) {
        setSelectedSongId(fallbackId ?? null);
      } else {
        setSelectedSongId(null);
        await fetchSongs({ reset: true });
      }
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "곡을 삭제하지 못했습니다.",
      );
    } finally {
      setSongDeleting(false);
    }
  };

  const openThumbnailDialog = () => {
    if (!songDetail) return;

    setThumbnailDefaultInput(songDetail.thumbnailDefault ?? "");
    setThumbnailMediumInput(songDetail.thumbnailMedium ?? "");
    setThumbnailHighInput(songDetail.thumbnailHigh ?? "");
    setThumbnailError(null);
    setShowThumbnailDialog(true);
  };

  const handleThumbnailSave = async () => {
    if (!songDetail) return;

    setThumbnailSaving(true);
    setThumbnailError(null);
    try {
      const updated = await updateSongThumbnails(songDetail.id, {
        thumbnailDefault: thumbnailDefaultInput,
        thumbnailMedium: thumbnailMediumInput,
        thumbnailHigh: thumbnailHighInput,
      });
      setSongDetail(updated);
      updateSongInList(updated);
      setShowThumbnailDialog(false);
    } catch (error) {
      setThumbnailError(
        error instanceof Error
          ? error.message
          : "썸네일을 저장하지 못했습니다.",
      );
    } finally {
      setThumbnailSaving(false);
    }
  };

  const artistIds = new Set(
    songDetail?.artists.map((artist) => artist.artistId) ?? [],
  );
  const detailThumbnailUrl = songDetail ? pickThumbnailUrl(songDetail) : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <header className="mb-5 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
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
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Admin
            </p>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              곡 관리
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              곡 정보, 아티스트 연결, 노래방 번호를 한 곳에서 관리하세요.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4">
              <label
                htmlFor="song-search"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                곡 검색
              </label>
              <input
                id="song-search"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="제목/한글제목으로 검색"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 shadow-sm transition focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>

            <div className="relative mb-4" ref={filtersRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                필터
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`h-4 w-4 text-zinc-500 transition-transform ${
                    filtersOpen ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {filtersOpen && (
                <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">
                        기본 필터
                      </p>
                      <label className="mt-2 flex cursor-pointer items-center gap-2 font-medium text-zinc-700 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={withoutArtistOnly}
                          onChange={(event) =>
                            setWithoutArtistOnly(event.target.checked)
                          }
                          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                        />
                        아티스트가 없는 곡만 보기
                      </label>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">
                        노래방 번호
                      </p>
                      <div className="mt-2 space-y-2">
                        {PROVIDERS.map((provider) => (
                          <div
                            key={provider}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="font-medium text-zinc-600 dark:text-zinc-300">
                              {PROVIDER_LABELS[provider]}
                            </span>
                            <select
                              value={providerPresence[provider]}
                              onChange={(event) =>
                                handleProviderFilterChange(
                                  provider,
                                  event.target.value as ProviderPresence,
                                )
                              }
                              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                            >
                              {PRESENCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">
                        추가 필터
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-zinc-600 dark:text-zinc-300">
                          썸네일
                        </span>
                        <select
                          value={thumbnailPresenceFilter}
                          onChange={(event) =>
                            setThumbnailPresenceFilter(
                              event.target.value as PresenceFilter,
                            )
                          }
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        >
                          {PRESENCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-zinc-600 dark:text-zinc-300">
                          한글 제목
                        </span>
                        <select
                          value={titleKoPresenceFilter}
                          onChange={(event) =>
                            setTitleKoPresenceFilter(
                              event.target.value as PresenceFilter,
                            )
                          }
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        >
                          {PRESENCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>곡 목록</span>
              {listLoading ? (
                <span>불러오는 중...</span>
              ) : (
                <span>{songs.length}곡</span>
              )}
            </div>

            <div
              ref={listContainerRef}
              className="h-[55vh] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              {listError ? (
                <div className="p-4 text-sm text-red-600 dark:text-red-400">
                  {listError}
                </div>
              ) : (
                <>
                  {songs.length === 0 && !listLoading ? (
                    <div className="flex h-full items-center justify-center p-6 text-sm text-zinc-500 dark:text-zinc-400">
                      조건에 맞는 곡이 없습니다.
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {songs.map((song) => {
                        const isSelected = song.id === selectedSongId;
                        return (
                          <li
                            key={song.id}
                            className={`cursor-pointer p-4 transition ${
                              isSelected
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                : "bg-white text-zinc-900 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                            }`}
                            onClick={() => setSelectedSongId(song.id)}
                          >
                            <div className="flex gap-3">
                              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                                {pickThumbnailUrl(song) ? (
                                  <img
                                    src={pickThumbnailUrl(song) ?? ""}
                                    alt={`${song.title} 썸네일`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className={`flex h-full items-center justify-center text-[10px] ${
                                      isSelected
                                        ? "text-zinc-200 dark:text-zinc-500"
                                        : "text-zinc-400 dark:text-zinc-500"
                                    }`}
                                  >
                                    No Img
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">
                                  {song.title}
                                </p>
                                {song.titleKo && (
                                  <p
                                    className={`truncate text-sm ${
                                      isSelected
                                        ? "text-zinc-200 dark:text-zinc-600"
                                        : "text-zinc-500 dark:text-zinc-400"
                                    }`}
                                  >
                                    {song.titleKo}
                                  </p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {song.artists.length > 0 ? (
                                    song.artists.map((artist) => (
                                      <span
                                        key={artist.id}
                                        className={`rounded-full px-2 py-0.5 text-xs ${
                                          isSelected
                                            ? "bg-white/20 text-white"
                                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                        }`}
                                      >
                                        {artist.nameKo || artist.name}
                                      </span>
                                    ))
                                  ) : (
                                    <span
                                      className={`text-xs ${
                                        isSelected
                                          ? "text-zinc-200 dark:text-zinc-600"
                                          : "text-zinc-500 dark:text-zinc-400"
                                      }`}
                                    >
                                      아티스트 없음
                                    </span>
                                  )}
                                </div>
                                <div className="mt-3 flex gap-2">
                                  {PROVIDERS.map((provider) => (
                                    <span
                                      key={provider}
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        song.karaokeProviders[provider]
                                          ? isSelected
                                            ? "bg-green-500/20 text-green-100"
                                            : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-100"
                                          : isSelected
                                            ? "bg-white/10 text-zinc-200"
                                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                      }`}
                                    >
                                      {provider}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div
                    ref={loadMoreTriggerRef}
                    className="p-3 text-center text-xs text-zinc-400 dark:text-zinc-500"
                  >
                    {listLoading
                      ? "불러오는 중..."
                      : loadingMore
                        ? "더 불러오는 중..."
                        : hasMoreSongs
                          ? "아래로 스크롤하면 더 불러옵니다."
                          : "모든 곡을 불러왔습니다."}
                  </div>
                  {loadMoreError && (
                    <div className="px-4 pb-4 text-xs text-red-600 dark:text-red-400">
                      {loadMoreError}
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {!selectedSongId && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-zinc-500 dark:text-zinc-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-12 w-12 text-zinc-400 dark:text-zinc-500"
                >
                  <path
                    d="M9 3v12l7 4V7l-7-4Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 7v10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
                  곡을 선택하세요
                </p>
                <p>왼쪽 목록에서 편집할 곡을 선택하면 정보가 표시됩니다.</p>
              </div>
            )}

            {selectedSongId && detailLoading && (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                곡 정보를 불러오는 중입니다...
              </div>
            )}

            {selectedSongId && !detailLoading && !songDetail && detailError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {detailError}
              </div>
            )}

            {selectedSongId && !detailLoading && songDetail && (
              <div className="space-y-8">
                {detailError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {detailError}
                  </div>
                )}

                <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                        {detailThumbnailUrl ? (
                          <img
                            src={detailThumbnailUrl}
                            alt={`${songDetail.title} 썸네일`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                            썸네일 없음
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          곡 정보
                        </p>
                        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                          {songDetail.title}
                        </h2>
                        {songDetail.titleKo && (
                          <p className="text-lg text-zinc-500 dark:text-zinc-300">
                            {songDetail.titleKo}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openThumbnailDialog}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        썸네일 설정
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTitleInput(songDetail.title);
                          setTitleKoInput(songDetail.titleKo ?? "");
                          setTitleError(null);
                          setShowTitleDialog(true);
                        }}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        제목 수정
                      </button>
                      <button
                        type="button"
                        onClick={handleSongDelete}
                        disabled={songDeleting}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        {songDeleting ? "삭제 중..." : "곡 삭제"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        아티스트
                      </p>
                      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        연결된 아티스트 {songDetail.artists.length}명
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowArtistDialog(true);
                        setArtistError(null);
                      }}
                      className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      아티스트 연결하기
                    </button>
                  </div>
                  {songDetail.artists.length === 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      연결된 아티스트가 없습니다. 위 버튼을 눌러 아티스트를
                      연결하세요.
                    </p>
                  )}
                  {songDetail.artists.length > 0 && (
                    <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                      {songDetail.artists.map((artist) => (
                        <li
                          key={artist.artistId}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                              {artist.nameKo || artist.name}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {artist.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleArtistRemove(artist.artistId)}
                            disabled={removingArtistId === artist.artistId}
                            className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            {removingArtistId === artist.artistId
                              ? "삭제 중..."
                              : "삭제"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        노래방 번호
                      </p>
                      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        TJ / KY / JOYSOUND 관리
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowKaraokeDialog(true);
                        setKaraokeProvider(null);
                        setKaraokeError(null);
                      }}
                      className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      번호 관리
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {PROVIDERS.map((provider) => (
                      <div key={provider} className="flex justify-between">
                        <span className="font-medium text-zinc-600 dark:text-zinc-300">
                          {PROVIDER_LABELS[provider]}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {providerNumbers[provider]
                            ? `번호 ${providerNumbers[provider]}`
                            : "번호 미등록"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {showTitleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              곡 제목 수정
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              곡 제목과 한국어 제목을 수정할 수 있습니다.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="song-title-input"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  제목
                </label>
                <input
                  id="song-title-input"
                  type="text"
                  value={titleInput}
                  onChange={(event) => {
                    setTitleInput(event.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
              <div>
                <label
                  htmlFor="song-title-ko-input"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  한국어 제목
                </label>
                <input
                  id="song-title-ko-input"
                  type="text"
                  value={titleKoInput}
                  onChange={(event) => {
                    setTitleKoInput(event.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
              {titleError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {titleError}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTitleDialog(false)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSongTitleSave}
                disabled={titleSaving}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {titleSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showThumbnailDialog && songDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  곡 썸네일 설정
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  썸네일 URL을 입력해주세요. 비워두면 해당 사이즈 썸네일이
                  제거됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowThumbnailDialog(false);
                  setThumbnailError(null);
                }}
                className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="thumbnail-default-input"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  Default
                </label>
                <input
                  id="thumbnail-default-input"
                  type="url"
                  value={thumbnailDefaultInput}
                  onChange={(event) => {
                    setThumbnailDefaultInput(event.target.value);
                    if (thumbnailError) setThumbnailError(null);
                  }}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="thumbnail-medium-input"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  Medium
                </label>
                <input
                  id="thumbnail-medium-input"
                  type="url"
                  value={thumbnailMediumInput}
                  onChange={(event) => {
                    setThumbnailMediumInput(event.target.value);
                    if (thumbnailError) setThumbnailError(null);
                  }}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="thumbnail-high-input"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  High
                </label>
                <input
                  id="thumbnail-high-input"
                  type="url"
                  value={thumbnailHighInput}
                  onChange={(event) => {
                    setThumbnailHighInput(event.target.value);
                    if (thumbnailError) setThumbnailError(null);
                  }}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
            </div>
            {thumbnailError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {thumbnailError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowThumbnailDialog(false)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleThumbnailSave}
                disabled={thumbnailSaving}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {thumbnailSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArtistDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  아티스트 연결하기
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  아티스트를 검색해 곡에 연결하세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowArtistDialog(false);
                  setArtistError(null);
                  setArtistResults([]);
                  setArtistQuery("");
                }}
                className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/70">
              <label
                htmlFor="artist-search"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                아티스트 검색
              </label>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  id="artist-search"
                  type="search"
                  value={artistQuery}
                  onChange={(event) => {
                    setArtistQuery(event.target.value);
                    if (artistError) setArtistError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleArtistSearch();
                    }
                  }}
                  placeholder="이름 또는 별칭 검색"
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button
                  type="button"
                  onClick={handleArtistSearch}
                  disabled={artistSearching}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {artistSearching ? "검색 중..." : "검색"}
                </button>
              </div>
              {artistError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {artistError}
                </p>
              )}
            </div>

            <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              {artistResults.length === 0 && !artistSearching && (
                <div className="flex items-center justify-center p-6 text-sm text-zinc-500 dark:text-zinc-400">
                  검색 결과가 없습니다.
                </div>
              )}
              {artistResults.length > 0 && (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {artistResults.map((artist) => {
                    const alreadyConnected = artistIds.has(artist.id);
                    return (
                      <li
                        key={artist.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {artist.nameKo || artist.name}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {artist.name}
                            {artist.slug ? ` · @${artist.slug}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleArtistConnect(artist.id)}
                          disabled={
                            alreadyConnected || connectingArtistId === artist.id
                          }
                          className="rounded-full border border-zinc-200 px-4 py-1 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                          {alreadyConnected
                            ? "연결됨"
                            : connectingArtistId === artist.id
                              ? "연결 중..."
                              : "연결"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showKaraokeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-100">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              노래방 번호 관리
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              TJ / KY / JOYSOUND 번호를 한 번에 관리하세요.
            </p>
            <div className="mt-4 space-y-4">
              {PROVIDERS.map((provider) => (
                <div
                  key={provider}
                  className="space-y-2 rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/70"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">
                      {PROVIDER_LABELS[provider]}
                    </p>
                    {providerNumbers[provider] && (
                      <button
                        type="button"
                        onClick={() => handleKaraokeDelete(provider)}
                        disabled={deletingProvider === provider}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        {deletingProvider === provider ? "삭제 중..." : "삭제"}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={
                      karaokeProvider === provider
                        ? karaokeInput
                        : (providerNumbers[provider] ?? "")
                    }
                    onFocus={() => {
                      setKaraokeProvider(provider);
                      setKaraokeInput(providerNumbers[provider] ?? "");
                      if (karaokeError) setKaraokeError(null);
                    }}
                    onChange={(event) => {
                      setKaraokeProvider(provider);
                      setKaraokeInput(event.target.value);
                      if (karaokeError) setKaraokeError(null);
                    }}
                    placeholder="노래방 번호를 입력하세요"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
              ))}
              {karaokeError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {karaokeError}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKaraokeDialog(false)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleKaraokeSave}
                disabled={karaokeSaving || !karaokeProvider}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {karaokeSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
