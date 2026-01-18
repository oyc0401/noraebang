"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { searchSongsForManager } from "../action-left";
import { useManagerArtists } from "../artist-list-context";
import { artistFilterOptions } from "../filter-options";
import {
  managerSortOptions,
  type ManagerSongSearchResult,
  type ManagerSortKey,
} from "../types";
import { useManagerStore } from "../store";
import { ArtistCard } from "./artist-card";
import { FilterDialog } from "./filter-dialog";
import Link from "next/link";

export function LeftPanel() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const songSearchRequestIdRef = useRef(0);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  const {
    artists,
    totalArtistCount,
    searchTerm,
    setSearchTerm,
    sortKey,
    setSortKey,
    selectedFilters,
    setSelectedFilters,
    isLoading,
    errorMessage,
    hasMore,
    loadMore,
  } = useManagerArtists();
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const setSelectedArtistId = useManagerStore(
    (state) => state.setSelectedArtistId,
  );
  const openCreateArtistDialog = useManagerStore(
    (state) => state.openCreateArtistDialog,
  );
  const [songResults, setSongResults] = useState<ManagerSongSearchResult[]>([]);
  const [isSongSearching, setIsSongSearching] = useState(false);
  const [songSearchError, setSongSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!scrollContainerRef.current || !sentinelRef.current || !hasMore) {
      return;
    }
    const container = scrollContainerRef.current;
    const sentinel = sentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore();
          }
        });
      },
      { root: container, threshold: 0.4 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const moveSelection = useCallback(
    (direction: "up" | "down") => {
      if (!artists.length) {
        return;
      }
      const currentIndex = artists.findIndex(
        (artist) => artist.id === selectedArtistId,
      );
      const fallbackIndex = direction === "down" ? 0 : artists.length - 1;
      const resolvedIndex = currentIndex === -1 ? fallbackIndex : currentIndex;
      const nextIndex =
        direction === "down" ? resolvedIndex + 1 : resolvedIndex - 1;

      if (nextIndex < 0) {
        return;
      }

      if (nextIndex >= artists.length) {
        if (!hasMore) return;
        selectionAnchorIndexRef.current = nextIndex;
        loadMore();
        return;
      }

      const nextArtist = artists[nextIndex];
      if (nextArtist) {
        setSelectedArtistId(nextArtist.id);
      }
    },
    [artists, hasMore, loadMore, selectedArtistId, setSelectedArtistId],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection("down");
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection("up");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moveSelection]);

  useEffect(() => {
    const targetIndex = selectionAnchorIndexRef.current;
    if (targetIndex === null) {
      return;
    }
    if (targetIndex < artists.length) {
      const target = artists[targetIndex];
      if (target) {
        setSelectedArtistId(target.id);
        selectionAnchorIndexRef.current = null;
      }
    }
  }, [artists, setSelectedArtistId]);

  const hasSearchTerm = searchTerm.trim().length > 0;

  useEffect(() => {
    const requestId = ++songSearchRequestIdRef.current;
    const trimmed = searchTerm.trim();

    if (!trimmed) {
      setSongResults([]);
      setSongSearchError(null);
      setIsSongSearching(false);
      return;
    }

    setIsSongSearching(true);
    setSongSearchError(null);

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const results = await searchSongsForManager(trimmed, 15);
        if (cancelled || songSearchRequestIdRef.current !== requestId) {
          return;
        }
        setSongResults(results);
        setSongSearchError(null);
      } catch (error) {
        console.error(error);
        if (cancelled || songSearchRequestIdRef.current !== requestId) {
          return;
        }
        setSongResults([]);
        setSongSearchError("곡 검색에 실패했습니다.");
      } finally {
        if (cancelled || songSearchRequestIdRef.current !== requestId) {
          return;
        }
        setIsSongSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (selectedArtistId === null) {
      return;
    }
    const cardElement = document.getElementById(
      `artist-card-${selectedArtistId}`,
    );
    cardElement?.scrollIntoView({ block: "nearest" });
  }, [selectedArtistId, artists.length]);

  const availableFilters = artistFilterOptions;

  return (
    <>
      <section className="flex h-full min-h-0 flex-col border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 pb-2 pt-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-blue-400 hover:text-blue-600 cursor-pointer"
            >
              {`<`}
            </Link>
            <h2 className="text-lg font-semibold">아티스트 리스트</h2>
          </div>
          <button
            type="button"
            onClick={openCreateArtistDialog}
            className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-blue-200 hover:text-blue-600"
          >
            아티스트 생성
          </button>
        </div>

        <div className="space-y-3 border-b border-gray-200 p-4 ">
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none transition focus:border-blue-500"
              placeholder="ID 또는 이름 검색 (ID 입력 시 ID 검색)"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 cursor-pointer"
                onClick={() => setSearchTerm("")}
              >
                초기화
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-1 items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-200 px-3 py-2 text-sm">
              <span className="text-zinc-500">정렬</span>
              <select
                className="flex-1 bg-transparent text-sm outline-none"
                value={sortKey}
                onChange={(event) =>
                  setSortKey(event.target.value as ManagerSortKey)
                }
              >
                {managerSortOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-blue-400 hover:text-blue-600 cursor-pointer"
              onClick={() => setIsFilterDialogOpen(true)}
            >
              필터
              {selectedFilters.length > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {selectedFilters.length}
                </span>
              )}
            </button>
            {selectedFilters.length > 0 && (
              <button
                type="button"
                className="rounded-xl border border-zinc-100 px-3 py-2 text-xs text-zinc-400 transition hover:text-zinc-600 cursor-pointer"
                onClick={() => setSelectedFilters([])}
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div ref={scrollContainerRef} className="h-full overflow-y-auto ">
            {artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                selected={artist.id === selectedArtistId}
                onSelect={setSelectedArtistId}
              />
            ))}
            {errorMessage && (
              <div className="rounded-xl border border-dashed border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
            {!artists.length && !isLoading && !errorMessage && (
              <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-10 text-center text-sm text-zinc-500">
                조건을 만족하는 아티스트가 없습니다.
              </div>
            )}
            {hasSearchTerm && (
              <div className="mt-4 space-y-3 border-t border-dashed border-zinc-200 px-3 py-4">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-600">
                    곡 검색 결과
                  </span>
                  <span>
                    {songResults.length > 0 &&
                      `${songResults.length.toLocaleString()}건`}
                  </span>
                </div>
                {isSongSearching && (
                  <div className="text-xs text-zinc-500">
                    곡을 검색하는 중...
                  </div>
                )}
                {songSearchError && (
                  <div className="text-xs text-red-600">{songSearchError}</div>
                )}
                {!isSongSearching &&
                  !songSearchError &&
                  songResults.length === 0 && (
                    <div className="text-xs text-zinc-400">
                      곡 검색 결과가 없습니다.
                    </div>
                  )}
                {songResults.length > 0 && (
                  <div className="space-y-2">
                    {songResults.map((song) => (
                      <div
                        key={song.id}
                        className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-zinc-900">
                              {song.title}
                              {song.titleKo && (
                                <span className="ml-1 text-zinc-500">
                                  ({song.titleKo})
                                </span>
                              )}
                            </p>
                            {song.catalog && (
                              <p className="text-xs text-zinc-500">
                                {song.catalog.toUpperCase()}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400">
                            Song #{song.id}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">
                          연결된 아티스트
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {song.artists.length > 0 ? (
                            song.artists.map((artist) => (
                              <button
                                key={artist.id}
                                type="button"
                                onClick={() => setSelectedArtistId(artist.id)}
                                className="cursor-pointer rounded-full border border-blue-100 bg-white/80 px-2 py-0.5 text-[11px] text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
                              >
                                #{artist.id} {artist.name}
                                {artist.nameKo && (
                                  <span className="text-zinc-500">
                                    ({artist.nameKo})
                                  </span>
                                )}
                              </button>
                            ))
                          ) : (
                            <span className="text-[11px] text-zinc-400">
                              연결된 아티스트 없음
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div ref={sentinelRef} className="h-6" />
            {isLoading && (
              <div className="pb-4 text-center text-xs text-zinc-400">
                불러오는 중...
              </div>
            )}
            {!hasMore && artists.length > 0 && (
              <div className="pb-2 text-center text-[11px] text-zinc-400">
                더 이상 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>

      {isFilterDialogOpen && (
        <FilterDialog
          filters={availableFilters}
          selectedFilters={selectedFilters}
          onChange={setSelectedFilters}
          onClose={() => setIsFilterDialogOpen(false)}
        />
      )}
    </>
  );
}
