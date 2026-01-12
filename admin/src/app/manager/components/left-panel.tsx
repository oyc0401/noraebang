import { useEffect, useRef, useState } from "react";

import type {
  ArtistFilterDefinition,
  ArtistFilterId,
} from "../filter-options";
import {
  MANAGER_PAGE_SIZE,
  managerSortOptions,
  type ManagerArtistSummary,
  type ManagerSortKey,
} from "../types";
import { ArtistCard } from "./artist-card";
import { FilterDialog } from "./filter-dialog";

type LeftPanelProps = {
  artists: ManagerArtistSummary[];
  totalArtistCount: number;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sortKey: ManagerSortKey;
  onSortKeyChange: (value: ManagerSortKey) => void;
  selectedFilters: ArtistFilterId[];
  onFiltersChange: (filters: ArtistFilterId[]) => void;
  selectedArtistId: number | null;
  onSelectArtist: (artistId: number) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onRequestMore: () => void;
  hasMore: boolean;
  filters: ArtistFilterDefinition[];
};

export function LeftPanel({
  artists,
  totalArtistCount,
  searchTerm,
  onSearchTermChange,
  sortKey,
  onSortKeyChange,
  selectedFilters,
  onFiltersChange,
  selectedArtistId,
  onSelectArtist,
  isLoading,
  errorMessage,
  onRequestMore,
  hasMore,
  filters,
}: LeftPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  useEffect(() => {
    if (!scrollContainerRef.current || !sentinelRef.current) {
      return;
    }
    const container = scrollContainerRef.current;
    const sentinel = sentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onRequestMore();
          }
        });
      },
      { root: container, threshold: 0.4 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onRequestMore]);

  return (
    <>
      <section className="flex h-[min(900px,75vh)] min-h-[600px] flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
              onChange={(event) => onSearchTermChange(event.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 cursor-pointer"
                onClick={() => onSearchTermChange("")}
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
                  onSortKeyChange(event.target.value as ManagerSortKey)
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
                onClick={() => onFiltersChange([])}
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
                  onSelect={onSelectArtist}
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
          filters={filters}
          selectedFilters={selectedFilters}
          onChange={onFiltersChange}
          onClose={() => setIsFilterDialogOpen(false)}
        />
      )}
    </>
  );
}
