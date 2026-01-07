"use client";

import { useSearchStore } from "@/store/searchStore";

export function SearchBar() {
  const { query, setQuery } = useSearchStore();

  return (
    <div className="flex flex-col w-full">
      <div className="flex w-full items-center rounded-xl h-14 bg-surface-dark shadow-sm ring-1 ring-white/10 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary">
        <div className="flex items-center justify-center pl-4 text-gray-500">
          <span className="material-symbols-outlined">search</span>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-nonetext-white placeholder:text-gray-500 px-3 h-full focus:ring-0 text-base"
          placeholder="제목, 가수, 번호 검색..."
          autoFocus
        />
        <button
          type="button"
          className="pr-4 text-gray-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">mic</span>
        </button>
      </div>
    </div>
  );
}
