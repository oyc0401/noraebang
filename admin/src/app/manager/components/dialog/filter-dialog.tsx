"use client";

import { useEffect } from "react";

import { useManagerArtists } from "../../artist-list-context";
import {
  artistFilterOptions,
  type ArtistFilterDefinition,
  type ArtistFilterId,
} from "../../filter-options";
import { useManagerStore } from "../../store";

export function FilterDialog() {
  const { selectedFilters, setSelectedFilters } = useManagerArtists();
  const isOpen = useManagerStore((state) => state.isFilterDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeFilterDialog);
  const filters: ArtistFilterDefinition[] = artistFilterOptions;

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [closeDialog]);

  const toggleFilter = (filterId: ArtistFilterId) => {
    setSelectedFilters(
      selectedFilters.includes(filterId)
        ? selectedFilters.filter((id) => id !== filterId)
        : [...selectedFilters, filterId],
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">필터 옵션</h3>
            <p className="text-sm text-zinc-500">
              다중 선택 가능 · 하단 적용 버튼을 눌러주세요.
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-zinc-500 cursor-pointer"
            onClick={closeDialog}
          >
            닫기
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {filters.map((filter) => (
            <label
              key={filter.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm transition hover:border-blue-300"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedFilters.includes(filter.id)}
                onChange={() => toggleFilter(filter.id)}
              />
              <div>
                <p className="font-medium text-zinc-900">{filter.label}</p>
                {filter.description && (
                  <p className="text-xs text-zinc-500">
                    {filter.description}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 cursor-pointer"
            onClick={() => setSelectedFilters([])}
          >
            전체 해제
          </button>
          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white cursor-pointer"
            onClick={closeDialog}
          >
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}
