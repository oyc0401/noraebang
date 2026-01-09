"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useArtistsStore, SORT_OPTIONS } from "./store";

export function ArtistListSection() {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    sort,
    artists,
    artistsLoading,
    loadingMoreArtists,
    artistsHasMore,
    selectedArtist,
    debouncedSearch,
    setSort,
    setSelectedArtist,
    loadMoreArtists,
  } = useArtistsStore();

  const isFilteringArtists = debouncedSearch.trim().length > 0;

  useEffect(() => {
    if (!artistsHasMore || isFilteringArtists) return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreArtists();
      }
    });

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [artistsHasMore, isFilteringArtists, loadMoreArtists]);

  return (
    <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
      {/* Artist List Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
          Artists ({artists.length})
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
          <label htmlFor="artists-sort" className="sr-only">
            정렬
          </label>
          <select
            id="artists-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as any)}
            className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Artist List */}
      <div className="flex-1 overflow-y-auto">
        {artistsLoading && (
          <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            로딩 중...
          </div>
        )}

        {artists.map((artist) => (
          <button
            type="button"
            key={artist.id}
            id={`artist-${artist.id}`}
            onClick={() => setSelectedArtist(artist)}
            className={`w-full px-4 py-3 text-left border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
              selectedArtist?.id === artist.id
                ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                : ""
            }`}
            style={{ cursor: "pointer" }}
          >
            <div className="flex items-center gap-3">
              {artist.thumbnailHigh ||
              artist.thumbnailMedium ||
              artist.thumbnailDefault ? (
                <Image
                  src={
                    artist.thumbnailHigh ||
                    artist.thumbnailMedium ||
                    artist.thumbnailDefault ||
                    ""
                  }
                  alt={artist.nameKo}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                  {artist.nameKo}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {artist.name}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  분류: {artist.homeCatalog ?? "미지정"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  #{artist.id}
                </div>
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {artist.songCount}곡
                </div>
              </div>
            </div>
          </button>
        ))}

        <div ref={loadMoreRef} className="h-10 w-full">
          {loadingMoreArtists && (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              더 불러오는 중...
            </p>
          )}
        </div>

        {artists.length === 0 && !artistsLoading && (
          <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
