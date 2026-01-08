"use client";

import { useSearchStore } from "@/store/searchStore";
import { Logo } from "@/components/common/Logo";
import { SearchTrigger } from "./SearchTrigger";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

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
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-background-dark/95 pr-4 pl-2 py-4 backdrop-blur-md">
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
