"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createArtist, searchSongs } from "./actions";
import { ArtistDetailSection } from "./ArtistDetailSection";
import { ArtistListSection } from "./ArtistListSection";
import { SpotifyTracksSection } from "./SpotifyTracksSection";
import { useArtistsStore } from "./store";

export default function AdminArtistsPage() {
  const {
    searchQuery,
    debouncedSearch,
    selectedArtist,
    artists,
    pendingArtistId,
    message,
    sort,
    setSearchQuery,
    setDebouncedSearch,
    setSelectedArtist,
    setPendingArtistId,
    loadArtists,
    loadArtistById,
    loadSongs,
    loadSpotifyTracks,
    resetDialogStates,
  } = useArtistsStore();

  // 아티스트 생성 다이얼로그
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createNameKo, setCreateNameKo] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createCatalog, setCreateCatalog] = useState<string>("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 곡 검색 및 선택
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [songSearchResults, setSongSearchResults] = useState<any[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);
  const [songSearchLoading, setSongSearchLoading] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => window.clearTimeout(handler);
  }, [searchQuery, setDebouncedSearch]);

  // Load artists when debounced search or sort changes
  useEffect(() => {
    loadArtists();
  }, [debouncedSearch, sort, loadArtists]);

  // Load songs when selected artist changes
  useEffect(() => {
    if (!selectedArtist) return;
    loadSongs(selectedArtist.id);
  }, [selectedArtist, loadSongs]);

  // Load Spotify tracks when selected artist changes
  useEffect(() => {
    if (!selectedArtist) return;
    loadSpotifyTracks(selectedArtist.id);
  }, [selectedArtist, loadSpotifyTracks]);

  // Reset dialog states when selected artist changes
  useEffect(() => {
    resetDialogStates();
  }, [selectedArtist, resetDialogStates]);

  // Initial URL hash parsing
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash) {
      const artistId = Number.parseInt(hash.replace("#", ""), 10);
      if (Number.isFinite(artistId) && artistId > 0) {
        setPendingArtistId(artistId);
      }
    }
  }, [setPendingArtistId]);

  // Load artist by ID from pending
  useEffect(() => {
    if (!pendingArtistId || selectedArtist) return;
    loadArtistById(pendingArtistId);
  }, [pendingArtistId, selectedArtist, loadArtistById]);

  // Update URL hash when artist is selected
  useEffect(() => {
    if (selectedArtist) {
      window.history.replaceState(null, "", `#${selectedArtist.id}`);

      // Scroll to selected artist
      const element = document.getElementById(`artist-${selectedArtist.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedArtist]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!artists || artists.length === 0) return;

      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();

        const currentIndex = selectedArtist
          ? artists.findIndex((a) => a.id === selectedArtist.id)
          : -1;

        let nextIndex: number;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          nextIndex = currentIndex < artists.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : artists.length - 1;
        }

        setSelectedArtist(artists[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [artists, selectedArtist, setSelectedArtist]);

  // 곡 검색 디바운싱
  useEffect(() => {
    if (!songSearchQuery.trim()) {
      setSongSearchResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setSongSearchLoading(true);
      try {
        const results = await searchSongs(songSearchQuery);
        setSongSearchResults(results);
      } catch (error) {
        console.error("곡 검색 실패:", error);
      } finally {
        setSongSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [songSearchQuery]);

  // 아티스트 생성 핸들러
  const handleCreateArtist = async () => {
    setCreateLoading(true);
    setCreateError(null);

    try {
      const newArtist = await createArtist({
        name: createName,
        nameKo: createNameKo,
        slug: createSlug || undefined,
        homeCatalog: createCatalog || undefined,
        songIds: selectedSongIds.length > 0 ? selectedSongIds : undefined,
      });

      // 성공
      setCreateDialogOpen(false);
      setCreateName("");
      setCreateNameKo("");
      setCreateSlug("");
      setCreateCatalog("");
      setSelectedSongIds([]);
      setSongSearchQuery("");
      setSongSearchResults([]);

      // 리스트 새로고침 및 새 아티스트 선택
      await loadArtists();
      loadArtistById(newArtist.id);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "아티스트 생성 실패");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
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
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Artist & Songs 관리
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                아티스트와 곡을 관리합니다
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
          >
            + 아티스트 생성
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        <ArtistListSection />
        <ArtistDetailSection />
        <SpotifyTracksSection />
      </div>

      {/* 아티스트 생성 다이얼로그 */}
      {createDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                아티스트 생성
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setCreateError(null);
                }}
                className="cursor-pointer rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* 영문명 */}
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  영문명 *
                </label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="예) IU"
                />
              </div>

              {/* 한글명 */}
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  한글명 *
                </label>
                <input
                  value={createNameKo}
                  onChange={(e) => setCreateNameKo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="예) 아이유"
                />
              </div>

              {/* 별칭 */}
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  별칭 (선택)
                </label>
                <input
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="예) iu"
                />
              </div>

              {/* 분류 */}
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  분류 (선택)
                </label>
                <select
                  value={createCatalog}
                  onChange={(e) => setCreateCatalog(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="">선택 안 함</option>
                  <option value="KPOP">KPOP</option>
                  <option value="JPOP">JPOP</option>
                  <option value="POP">POP</option>
                  <option value="CPOP">CPOP</option>
                </select>
              </div>

              {/* 곡 검색 및 선택 */}
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  곡 연결 (선택)
                </label>
                <input
                  value={songSearchQuery}
                  onChange={(e) => setSongSearchQuery(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="곡 제목 또는 ID로 검색..."
                />

                {/* 선택된 곡 */}
                {selectedSongIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSongIds.map((songId) => {
                      const song = songSearchResults.find((s) => s.id === songId);
                      if (!song) return null;
                      return (
                        <div
                          key={songId}
                          className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs dark:bg-blue-900/30"
                        >
                          <span className="text-blue-700 dark:text-blue-300">
                            {song.titleKo || song.title} (ID: {song.id})
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedSongIds((prev) => prev.filter((id) => id !== songId))}
                            className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 검색 결과 */}
                {songSearchQuery && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                    {songSearchLoading ? (
                      <div className="p-3 text-sm text-zinc-500">검색 중...</div>
                    ) : songSearchResults.length === 0 ? (
                      <div className="p-3 text-sm text-zinc-500">검색 결과가 없습니다.</div>
                    ) : (
                      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                        {songSearchResults.map((song) => (
                          <button
                            key={song.id}
                            type="button"
                            onClick={() => {
                              if (selectedSongIds.includes(song.id)) {
                                setSelectedSongIds((prev) => prev.filter((id) => id !== song.id));
                              } else {
                                setSelectedSongIds((prev) => [...prev, song.id]);
                              }
                            }}
                            className={`w-full cursor-pointer p-3 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                              selectedSongIds.includes(song.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                            }`}
                          >
                            <div className="font-medium text-zinc-900 dark:text-zinc-50">
                              {song.titleKo || song.title}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              ID: {song.id}
                              {song.artists.length > 0 && ` · ${song.artists.map((a: any) => a.nameKo).join(", ")}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {createError && (
                <p className="text-sm text-red-500">{createError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setCreateError(null);
                  }}
                  className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCreateArtist}
                  disabled={createLoading || !createName.trim() || !createNameKo.trim()}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${
                    createLoading || !createName.trim() || !createNameKo.trim()
                      ? "bg-green-200 text-white dark:bg-green-900/40"
                      : "bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400"
                  }`}
                >
                  {createLoading ? "생성 중..." : "생성"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
