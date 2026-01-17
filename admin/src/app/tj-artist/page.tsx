"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  checkArtistConflicts,
  createArtist,
  createArtistAndMapSongs,
  getRealArtists,
  getTjArtists,
  getTjSongsByArtist,
  mapSongsToArtist,
  type RealArtistSummary,
  type SongSavedFilter,
  type TjArtistSummary,
} from "./actions";

const SORT_OPTIONS = [
  { value: "song_desc", label: "곡 많은 순" },
  { value: "song_asc", label: "곡 적은 순" },
  { value: "name_asc", label: "이름 오름차순" },
  { value: "name_desc", label: "이름 내림차순" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];
const SONG_SAVED_FILTERS: { value: SongSavedFilter; label: string }[] = [
  { value: "unsaved", label: "미저장" },
  { value: "all", label: "전체" },
  { value: "saved", label: "저장됨" },
];

type TjSongItem = Awaited<ReturnType<typeof getTjSongsByArtist>>[number];

export default function TjArtistPage() {
  const [sort, setSort] = useState<SortOption>("song_desc");
  const [hideFullySaved, setHideFullySaved] = useState(true);
  const [artistSearch, setArtistSearch] = useState("");

  const [artists, setArtists] = useState<TjArtistSummary[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [artistsError, setArtistsError] = useState<string | null>(null);

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  const [songs, setSongs] = useState<TjSongItem[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [songSavedFilter, setSongSavedFilter] =
    useState<SongSavedFilter>("all");
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [savingSelectedSongs, setSavingSelectedSongs] = useState(false);
  const [songSelectionError, setSongSelectionError] = useState<string | null>(
    null,
  );

  const [realArtistSearchInput, setRealArtistSearchInput] = useState("");
  const [realArtistSearch, setRealArtistSearch] = useState("");
  const [realArtists, setRealArtists] = useState<RealArtistSummary[]>([]);
  const [realArtistsLoading, setRealArtistsLoading] = useState(true);
  const [realArtistsError, setRealArtistsError] = useState<string | null>(null);
  const [selectedRealArtistId, setSelectedRealArtistId] = useState<
    number | null
  >(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createNameKo, setCreateNameKo] = useState("");
  const [createTjName, setCreateTjName] = useState("");
  const [createYoutubeMain, setCreateYoutubeMain] = useState("");
  const [createYoutubeTopic, setCreateYoutubeTopic] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [conflictChecking, setConflictChecking] = useState(false);
  const [conflicts, setConflicts] = useState({
    name: false,
    nameKo: false,
  });
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  const [quickCreateError, setQuickCreateError] = useState<string | null>(null);

  const fetchArtists = useCallback(async () => {
    setArtistsLoading(true);
    setArtistsError(null);
    try {
      const list = await getTjArtists();
      setArtists(list);
    } catch {
      setArtistsError("아티스트를 불러오지 못했습니다.");
    } finally {
      setArtistsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const filteredArtists = useMemo(() => {
    const normalizedSearch = artistSearch.trim().toLowerCase();
    const filtered = artists.filter((artist) => {
      if (hideFullySaved && artist.unsavedSongs <= 0) return false;
      if (!normalizedSearch) return true;
      return artist.name.toLowerCase().includes(normalizedSearch);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "song_desc":
          if (b.totalSongs !== a.totalSongs) {
            return b.totalSongs - a.totalSongs;
          }
          return a.name.localeCompare(b.name);
        case "song_asc":
          if (a.totalSongs !== b.totalSongs) {
            return a.totalSongs - b.totalSongs;
          }
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "name_asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return sorted;
  }, [artists, artistSearch, hideFullySaved, sort]);

  // Auto select first available artist
  useEffect(() => {
    if (artistsLoading) return;
    if (filteredArtists.length === 0) {
      setSelectedArtist(null);
      return;
    }

    if (
      selectedArtist &&
      filteredArtists.some((artist) => artist.name === selectedArtist)
    ) {
      return;
    }

    setSelectedArtist(filteredArtists[0].name);
  }, [filteredArtists, selectedArtist, artistsLoading]);

  const selectedArtistSummary = useMemo(
    () => artists.find((artist) => artist.name === selectedArtist) ?? null,
    [artists, selectedArtist],
  );

  const fetchSongs = useCallback(async () => {
    if (!selectedArtist) {
      setSongs([]);
      return;
    }
    setSongsLoading(true);
    setSongsError(null);
    try {
      const list = await getTjSongsByArtist(selectedArtist, songSavedFilter);
      setSongs(list);
    } catch {
      setSongsError("곡을 불러오지 못했습니다.");
    } finally {
      setSongsLoading(false);
    }
  }, [selectedArtist, songSavedFilter]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setRealArtistSearch(realArtistSearchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [realArtistSearchInput]);

  const fetchRealArtists = useCallback(async () => {
    setRealArtistsLoading(true);
    setRealArtistsError(null);
    try {
      const list = await getRealArtists(realArtistSearch || undefined);
      setRealArtists(list);
    } catch {
      setRealArtistsError("실제 아티스트를 불러오지 못했습니다.");
    } finally {
      setRealArtistsLoading(false);
    }
  }, [realArtistSearch]);

  useEffect(() => {
    fetchRealArtists();
  }, [fetchRealArtists]);

  useEffect(() => {
    if (realArtists.length === 0) {
      setSelectedRealArtistId(null);
      return;
    }
    if (!selectedRealArtistId) {
      setSelectedRealArtistId(realArtists[0].id);
      return;
    }
    if (!realArtists.some((artist) => artist.id === selectedRealArtistId)) {
      setSelectedRealArtistId(realArtists[0].id);
    }
  }, [realArtists, selectedRealArtistId]);

  const selectedRealArtist = useMemo(
    () =>
      selectedRealArtistId
        ? (realArtists.find((artist) => artist.id === selectedRealArtistId) ??
          null)
        : null,
    [realArtists, selectedRealArtistId],
  );

  useEffect(() => {
    setSelectedSongIds((prev) =>
      prev.filter((id) => songs.some((song) => song.id === id)),
    );
  }, [songs]);

  useEffect(() => {
    if (!selectedArtistSummary?.name) return;
    setRealArtistSearchInput(selectedArtistSummary.name);
  }, [selectedArtistSummary?.name]);

  useEffect(() => {
    if (!createDialogOpen) return;
    setConflictChecking(true);
    setCreateError(null);
    const handler = setTimeout(() => {
      checkArtistConflicts({
        name: createName.trim(),
        nameKo: createNameKo.trim() || undefined,
      })
        .then((res) => setConflicts({ name: res.name, nameKo: res.nameKo }))
        .catch(() => setCreateError("중복 확인 중 오류가 발생했습니다."))
        .finally(() => setConflictChecking(false));
    }, 300);
    return () => clearTimeout(handler);
  }, [createDialogOpen, createName, createNameKo]);

  const handleOpenCreateDialog = () => {
    const baseName = selectedArtistSummary?.name ?? "";
    setCreateName(baseName);
    setCreateNameKo("");
    setCreateTjName(baseName);
    setCreateYoutubeMain("");
    setCreateYoutubeTopic("");
    setConflicts({ name: false, nameKo: false });
    setCreateError(null);
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateLoading(false);
  };

  const handleCreateArtistSubmit = async () => {
    const trimmedName = createName.trim();
    const trimmedNameKo = createNameKo.trim();
    if (!trimmedName) {
      setCreateError("이름을 입력해주세요.");
      return;
    }
    if (conflicts.name || conflicts.nameKo) {
      if (typeof window !== "undefined") {
        window.alert("이미 존재하는 아티스트 이름이 있습니다.");
      }
      setCreateError("중복된 정보가 있습니다. 수정 후 다시 시도해주세요.");
      return;
    }
    if (conflictChecking) return;

    setCreateLoading(true);
    setCreateError(null);
    try {
      const artist = await createArtist({
        name: trimmedName,
        nameKo: trimmedNameKo || undefined,
        tjName: createTjName,
        youtubeMainUrl: createYoutubeMain,
        youtubeTopicUrl: createYoutubeTopic,
      });
      await fetchRealArtists();
      setSelectedRealArtistId(artist.id);
      setCreateDialogOpen(false);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "아티스트 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleQuickArtistSongCreate = async () => {
    if (!selectedArtistSummary) {
      if (typeof window !== "undefined") {
        window.alert("TJ 아티스트를 먼저 선택해주세요.");
      }
      return;
    }
    if (selectedSongIds.length === 0) {
      if (typeof window !== "undefined") {
        window.alert("매핑할 곡을 선택해주세요.");
      }
      return;
    }

    const trimmedName = selectedArtistSummary.name.trim();
    if (!trimmedName) {
      if (typeof window !== "undefined") {
        window.alert("선택된 아티스트 이름을 확인할 수 없습니다.");
      }
      return;
    }

    setQuickCreateLoading(true);
    setQuickCreateError(null);

    try {
      const conflicts = await checkArtistConflicts({ name: trimmedName });
      if (conflicts.name || conflicts.nameKo) {
        if (typeof window !== "undefined") {
          window.alert("이미 존재하는 아티스트 이름이 있습니다.");
        }
        setQuickCreateError("중복된 이름으로 생성할 수 없습니다.");
        return;
      }

      const result = await createArtistAndMapSongs({
        name: trimmedName,
        tjSongIds: selectedSongIds,
      });
      await Promise.all([fetchRealArtists(), fetchSongs(), fetchArtists()]);
      setSelectedRealArtistId(result.artist.id);
      setSelectedSongIds([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "아티스트 & 곡 제작 중 오류가 발생했습니다.";
      setQuickCreateError(message);
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setQuickCreateLoading(false);
    }
  };

  const handleBatchCreateAboveThreshold = async () => {
    const targets = filteredArtists.filter((artist) => artist.totalSongs >= 30);
    if (targets.length === 0) return;
    setQuickCreateLoading(true);
    setQuickCreateError(null);

    try {
      for (const target of targets) {
        const songs = await getTjSongsByArtist(target.name, "all");
        const tjIds = songs.map((song) => song.id);
        if (!tjIds.length) continue;

        const conflicts = await checkArtistConflicts({
          name: target.name.trim(),
        });
        if (conflicts.name || conflicts.nameKo) {
          continue;
        }

        await createArtistAndMapSongs({
          name: target.name.trim(),
          tjSongIds: tjIds,
        });
      }

      await Promise.all([fetchRealArtists(), fetchSongs(), fetchArtists()]);
      setSelectedSongIds([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "자동 매핑 중 오류가 발생했습니다.";
      setQuickCreateError(message);
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setQuickCreateLoading(false);
    }
  };

  const disableCreateSubmit =
    !createName.trim() ||
    conflicts.name ||
    conflicts.nameKo ||
    conflictChecking ||
    createLoading;

  const allSongsSelected =
    songs.length > 0 && selectedSongIds.length === songs.length;

  const handleToggleSongSelection = (songId: string) => {
    setSongSelectionError(null);
    setSelectedSongIds((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId],
    );
  };

  const handleToggleSelectAllSongs = () => {
    setSongSelectionError(null);
    if (allSongsSelected) {
      setSelectedSongIds([]);
    } else {
      setSelectedSongIds(songs.map((song) => song.id));
    }
  };

  const handleSaveSelectedSongs = async () => {
    if (!selectedSongIds.length) return;
    if (!selectedRealArtistId) {
      setSongSelectionError("먼저 실제 Artist를 선택해주세요.");
      return;
    }
    setSavingSelectedSongs(true);
    setSongSelectionError(null);
    try {
      await mapSongsToArtist(selectedRealArtistId, selectedSongIds);
      setSelectedSongIds([]);
      await Promise.all([fetchSongs(), fetchArtists()]);
    } catch (error) {
      setSongSelectionError(
        error instanceof Error
          ? error.message
          : "선택 곡 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setSavingSelectedSongs(false);
    }
  };

  const disableSaveSelected =
    selectedSongIds.length === 0 || savingSelectedSongs;
  const selectedRealArtistLabel = selectedRealArtist
    ? `${selectedRealArtist.nameKo || selectedRealArtist.name} · ID ${
        selectedRealArtist.id
      }`
    : null;
  const youtubeSearchQueryName =
    createName.trim() || selectedArtistSummary?.name?.trim() || "";
  const youtubeSearchUrl = youtubeSearchQueryName
    ? `https://music.youtube.com/search?q=${encodeURIComponent(
        youtubeSearchQueryName,
      )}`
    : null;
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 p-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">TJ 아티스트</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          TJ 곡 데이터 기준 아티스트 목록과 저장 상태를 빠르게 확인하세요.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:overflow-hidden">
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:w-80 lg:flex-none lg:max-h-[calc(100vh-200px)] lg:overflow-hidden xl:w-96">
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleBatchCreateAboveThreshold}
              className="w-full cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
            >
              TJ 30곡↑ 자동 매핑
            </button>
            <input
              type="search"
              placeholder="아티스트 검색"
              value={artistSearch}
              onChange={(event) => setArtistSearch(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder-zinc-500"
            />

            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-300">
                정렬
              </label>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <input
                type="checkbox"
                checked={hideFullySaved}
                onChange={(event) => setHideFullySaved(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              저장 안 된 곡이 있는 아티스트만 보기
            </label>
          </div>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

          <div className="flex-1 overflow-y-auto">
            {artistsLoading ? (
              <p className="text-sm text-zinc-500">아티스트를 불러오는 중...</p>
            ) : artistsError ? (
              <p className="text-sm text-red-500">{artistsError}</p>
            ) : filteredArtists.length === 0 ? (
              <p className="text-sm text-zinc-500">
                조건에 맞는 아티스트가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredArtists.map((artist) => {
                  const isSelected = artist.name === selectedArtist;
                  return (
                    <li key={artist.name}>
                      <button
                        type="button"
                        onClick={() => setSelectedArtist(artist.name)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          isSelected
                            ? "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-100"
                            : "border-zinc-200 bg-white hover:border-sky-200 hover:bg-sky-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span className="truncate">{artist.name}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {artist.totalSongs.toLocaleString()}곡
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                          <span>미저장 {artist.unsavedSongs}</span>
                          <span>저장 {artist.savedSongs}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:max-h-[calc(100vh-200px)] lg:overflow-hidden">
          {!selectedArtistSummary ? (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              표시할 아티스트가 없습니다.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {selectedArtistSummary.name}
                    </h2>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      총 {selectedArtistSummary.totalSongs.toLocaleString()}곡 ·
                      미저장{" "}
                      {selectedArtistSummary.unsavedSongs.toLocaleString()}곡
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      실매핑:{" "}
                      {selectedRealArtistLabel ??
                        "실제 Artist를 오른쪽에서 선택"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleOpenCreateDialog}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-500 px-4 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      아티스트 만들기
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickArtistSongCreate}
                      disabled={
                        quickCreateLoading || selectedSongIds.length === 0
                      }
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition ${
                        quickCreateLoading || selectedSongIds.length === 0
                          ? "cursor-not-allowed bg-indigo-300 dark:bg-indigo-900/40"
                          : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      }`}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      {quickCreateLoading ? "제작 중..." : "아티스트 & 곡 제작"}
                    </button>
                  </div>
                  {quickCreateError && (
                    <p className="text-xs text-red-500">{quickCreateError}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  {SONG_SAVED_FILTERS.map((filter) => {
                    const active = filter.value === songSavedFilter;
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setSongSavedFilter(filter.value)}
                        className={`rounded-full px-3 py-1 transition ${
                          active
                            ? "bg-sky-600 text-white dark:bg-sky-500"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={allSongsSelected}
                      onChange={handleToggleSelectAllSongs}
                      className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    전체 선택
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    선택 {selectedSongIds.length}곡
                  </span>
                  <button
                    type="button"
                    disabled={disableSaveSelected}
                    onClick={handleSaveSelectedSongs}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      disableSaveSelected
                        ? "cursor-not-allowed bg-sky-200 text-white dark:bg-sky-900/30"
                        : "bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
                    }`}
                  >
                    {savingSelectedSongs ? "저장 중..." : "선택 곡 저장"}
                  </button>
                </div>
                {selectedRealArtistLabel && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    선택 곡 저장 시 {selectedRealArtistLabel} 기준으로
                    매핑됩니다.
                  </p>
                )}
                {songSelectionError && (
                  <p className="text-xs text-red-500">{songSelectionError}</p>
                )}
              </div>

              <div className="mt-4 flex-1 overflow-y-auto">
                {songsLoading ? (
                  <p className="text-sm text-zinc-500">곡을 불러오는 중...</p>
                ) : songsError ? (
                  <p className="text-sm text-red-500">{songsError}</p>
                ) : songs.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    선택한 조건에 해당하는 곡이 없습니다.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {songs.map((song) => (
                      <li key={song.id} className="py-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedSongIds.includes(song.id)}
                            onChange={() => handleToggleSongSelection(song.id)}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-900"
                          />
                          <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                                {song.title}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {song.publishdate || "미정"} ·{" "}
                                {song.artistList.join(", ")}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                song.saved
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
                              }`}
                            >
                              {song.saved ? "저장됨" : "미저장"}
                            </span>
                          </div>
                        </div>
                        {song.featureList.length > 0 && (
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            피처링: {song.featureList.join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:w-80 lg:flex-none lg:max-h-[calc(100vh-200px)] lg:overflow-hidden xl:w-96">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              실제 Artist
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Artist 테이블에서 연결 대상 찾기
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="search"
              placeholder="실제 Artist 검색"
              value={realArtistSearchInput}
              onChange={(event) => setRealArtistSearchInput(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder-zinc-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              검색어 {realArtistSearch ? `"${realArtistSearch}"` : "없음"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {realArtistsLoading ? (
              <p className="text-sm text-zinc-500">
                실제 아티스트를 불러오는 중...
              </p>
            ) : realArtistsError ? (
              <p className="text-sm text-red-500">{realArtistsError}</p>
            ) : realArtists.length === 0 ? (
              <p className="text-sm text-zinc-500">
                조건에 맞는 실제 아티스트가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {realArtists.map((artist) => (
                  <li key={artist.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRealArtistId(artist.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selectedRealArtistId === artist.id
                          ? "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-50"
                          : "border-zinc-200 bg-white hover:border-sky-200 hover:bg-sky-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="truncate">
                          {artist.nameKo || artist.name}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {artist.songCount}곡
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {artist.name} · ID {artist.id}
                      </p>
                      {artist.slug && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          @{artist.slug}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedRealArtist && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                    선택된 Artist
                  </p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedRealArtist.nameKo || selectedRealArtist.name}
                  </p>
                </div>
                <Link
                  href={`/artists#${selectedRealArtist.id}`}
                  className="rounded-full border border-sky-200 px-3 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-900/40"
                >
                  관리 페이지
                </Link>
              </div>
              <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                <p>영문명: {selectedRealArtist.name}</p>
                <p>ID: {selectedRealArtist.id}</p>
                <p>곡 수: {selectedRealArtist.songCount}</p>
                {selectedRealArtist.slug && (
                  <p>별칭: @{selectedRealArtist.slug}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {createDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  아티스트 & 곡 제작
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  선택된 TJ 아티스트 정보를 기반으로 기본 값이 채워졌습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateDialog}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  영문명 *
                </label>
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-zinc-900 ${
                    conflicts.name
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                      : "border-zinc-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-zinc-700"
                  }`}
                  placeholder="예) IU"
                />
                {conflicts.name && (
                  <p className="mt-1 text-xs text-red-500">
                    이미 동일한 영문명이 존재합니다.
                  </p>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  한글명 (선택)
                </label>
                <input
                  value={createNameKo}
                  onChange={(event) => setCreateNameKo(event.target.value)}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-zinc-900 ${
                    conflicts.nameKo
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                      : "border-zinc-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-zinc-700"
                  }`}
                  placeholder="예) 아이유"
                />
                {conflicts.nameKo && (
                  <p className="mt-1 text-xs text-red-500">
                    이미 동일한 한글명이 존재합니다.
                  </p>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  TJ 표기명 (선택)
                </label>
                <input
                  value={createTjName}
                  onChange={(event) => setCreateTjName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="예) 아이유"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    메인 YouTube 링크 (선택)
                  </label>
                  <a
                    href={youtubeSearchUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`text-xs font-semibold ${
                      youtubeSearchUrl
                        ? "text-sky-600 hover:underline dark:text-sky-400"
                        : "cursor-not-allowed text-zinc-400 dark:text-zinc-600"
                    }`}
                    onClick={(event) => {
                      if (!youtubeSearchUrl) {
                        event.preventDefault();
                      }
                    }}
                  >
                    유튜브 검색
                  </a>
                </div>
                <input
                  value={createYoutubeMain}
                  onChange={(event) => setCreateYoutubeMain(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="https://www.youtube.com/@channel 또는 채널 ID"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  입력하면 YouTube API로 채널을 조회해 메인 채널로 저장합니다.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  토픽 YouTube 링크 (선택)
                </label>
                <input
                  value={createYoutubeTopic}
                  onChange={(event) =>
                    setCreateYoutubeTopic(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="https://www.youtube.com/@artist-topic"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  토픽 URL/ID 입력 시 자동으로 토픽 채널 정보를 저장합니다.
                </p>
              </div>
            </div>

            {conflictChecking && (
              <p className="mt-3 text-xs text-zinc-500">
                중복 여부를 확인하는 중입니다...
              </p>
            )}

            {createError && (
              <p className="mt-3 text-sm text-red-500">{createError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseCreateDialog}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                disabled={disableCreateSubmit}
                onClick={handleCreateArtistSubmit}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  disableCreateSubmit
                    ? "cursor-not-allowed bg-sky-200 text-white dark:bg-sky-900/40"
                    : "bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
                }`}
              >
                {createLoading ? "생성 중..." : "아티스트 생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
