"use client";

import { useSearchStore } from "@/store/searchStore";
import { Logo } from "@/components/common/Logo";
import { SearchTrigger } from "./SearchTrigger";
import Link from "next/link";

interface SearchHeaderProps {
  value?: string;
}

export function SearchHeader({ value }: SearchHeaderProps) {
  const { setSearchActive, setQuery } = useSearchStore();

  const handleClear = () => {
    setQuery("");
    setSearchActive(true);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-background-dark/95 px-4 py-4 backdrop-blur-md">
      <Link
        href="/"
        className="flex items-center justify-center text-white transition-opacity hover:opacity-80 shrink-0"
      >
        <Logo />
      </Link>
      <div className="flex-1">
        <SearchTrigger
          onClick={() => setSearchActive(true)}
          onClear={handleClear}
          value={value}
        />
      </div>
      <button
        type="button"
        aria-label="프로필"
        className="flex size-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white shrink-0"
      >
        SJ
      </button>
    </header>
  );
}
