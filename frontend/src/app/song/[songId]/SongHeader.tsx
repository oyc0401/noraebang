"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSearchStore } from "@/store/searchStore";
import { Logo } from "@/components/common/Logo";

interface SongHeaderProps {
  transparent?: boolean;
}

export function SongHeader({ transparent }: SongHeaderProps) {
  const { setSearchActive } = useSearchStore();

  return (
    <header
      className={cn(
        "z-20 flex h-14 items-center justify-between pl-2 pr-1.5 transition-colors duration-100",
        transparent ? "bg-transparent" : "sticky top-0 bg-background-dark/95",
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-3 pl-2 text-white transition-opacity hover:opacity-80"
        aria-label="홈으로 이동"
      >
        <Logo />
        <span className="text-lg font-semibold tracking-[-0.015em]">
          Sing It!
        </span>
      </Link>
      <div className="flex items-center">
        <button
          type="button"
          className="flex size-11 items-center justify-center text-gray-400 transition-colors hover:text-white cursor-pointer"
          aria-label="검색"
          onClick={() => setSearchActive(true)}
        >
          <Search className="size-6" />
        </button>
      </div>
    </header>
  );
}
