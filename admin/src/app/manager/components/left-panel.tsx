"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useManagerArtists } from "../artist-list-context";
import { artistFilterOptions } from "../filter-options";
import {
  MANAGER_PAGE_SIZE,
  managerSortOptions,
  type ManagerSortKey,
} from "../types";
import { useManagerStore } from "../store";
import { ArtistCard } from "./artist-card";
import { FilterDialog } from "./filter-dialog";

export function LeftPanel() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const selectionAnchorIndexRef = useRef<number | null>(null);
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
      <section className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">아티스트 리스트</h2>
              <p className="text-sm text-zinc-500">
                무한 스크롤 · 페이지 당 {MANAGER_PAGE_SIZE}명
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
              표시 중 {artists.length.toLocaleString()}명 / 총{" "}
              {totalArtistCount.toLocaleString()}명
            </span>
          </div>
        </div>

        <div className="space-y-3 border-b border-zinc-100 p-4">
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

        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto px-4 py-3"
          >
            <div className="space-y-3">
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
