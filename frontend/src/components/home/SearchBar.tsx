"use client";

import { Search as SearchIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchStore } from "@/store/searchStore";

export function SearchBar() {
  const { query, setQuery } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex w-full items-center rounded-xl h-14 bg-surface-dark shadow-sm ring-1 ring-white/10 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary">
      <div className="flex items-center justify-center pl-4 text-[#6B7280]">
        <SearchIcon className="size-5" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 bg-transparent border-none text-white placeholder:text-[#6B7280] px-3 h-full focus:ring-0 text-base"
        placeholder="제목, 가수, 번호 검색..."
      />
      <button
        type="button"
        className="pr-4 text-[#6B7280] hover:text-primary transition-colors"
      ></button>
    </div>
  );
}
