"use client";

import { Search as SearchIcon, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchStore } from "@/store/searchStore";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const { query, setQuery, clearSearch } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${query}`);
      clearSearch();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center rounded-xl h-11 bg-surface-dark shadow-sm ring-1 ring-white/10 overflow-hidden transition-all focus-within:ring-primary"
    >
      <div className="flex items-center justify-center pl-4 text-[#6B7280]">
        <SearchIcon className="size-5" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 bg-transparent border-none text-white placeholder:text-[#6B7280] px-3 h-full focus:ring-0 outline-none text-base"
        placeholder="제목, 가수, 번호 검색..."
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="flex items-center justify-center pr-4 text-[#6B7280] hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>
      )}
      <button type="submit" className="sr-only"></button>
    </form>
  );
}
