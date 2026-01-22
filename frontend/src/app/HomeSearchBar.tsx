"use client";

import { Search as SearchIcon } from "lucide-react";
import { useSearchStore } from "@/store/searchStore";

export function HomeSearchBar() {
  const { setSearchActive } = useSearchStore();

  return (
    <button
      type="button"
      onClick={() => setSearchActive(true)}
      className="flex w-full items-center rounded-lg h-14 bg-surface-dark shadow-sm overflow-hidden transition-all cursor-pointer"
    >
      <div className="flex items-center justify-center pl-4 text-[#6B7280]">
        <SearchIcon className="size-6" />
      </div>
      <div className="flex-1 text-left px-3 text-[#6B7280] text-base">
        제목, 가수, 번호 검색...
      </div>
    </button>
  );
}
