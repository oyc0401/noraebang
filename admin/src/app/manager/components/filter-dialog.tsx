"use client";

import { useEffect } from "react";

import type {
  ArtistFilterDefinition,
  ArtistFilterId,
} from "../filter-options";

type FilterDialogProps = {
  filters: ArtistFilterDefinition[];
  selectedFilters: ArtistFilterId[];
  onChange: (filters: ArtistFilterId[]) => void;
  onClose: () => void;
};

export function FilterDialog({
  filters,
  selectedFilters,
  onChange,
  onClose,
}: FilterDialogProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const toggleFilter = (filterId: ArtistFilterId) => {
    onChange(
      selectedFilters.includes(filterId)
        ? selectedFilters.filter((id) => id !== filterId)
        : [...selectedFilters, filterId],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
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
            onClick={onClose}
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
                  <p className="text-xs text-zinc-500">{filter.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 cursor-pointer"
            onClick={() => onChange([])}
          >
            전체 해제
          </button>
          <button
            type="button"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-pointer"
            onClick={onClose}
          >
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}
