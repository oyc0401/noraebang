"use client";

import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/common/Logo";
import { useSearchStore } from "@/store/searchStore";
import { SearchTrigger } from "./SearchTrigger";

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
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background-dark/95 pl-2 pr-1.5 backdrop-blur-md">
      <Link
        href="/"
        className="text-gray-400 hover:text-white transition-colors size-11 flex items-center justify-center"
      >
        <ArrowLeft className="size-6" />
      </Link>
      <div className="flex-1">
        <SearchTrigger
          onClick={() => setSearchActive(true)}
          onClear={handleClear}
          value={value}
        />
      </div>
    </header>
  );
}
