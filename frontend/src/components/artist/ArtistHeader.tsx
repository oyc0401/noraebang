"use client";

import { ArrowLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSearchStore } from "@/store/searchStore";

interface ArtistHeaderProps {
  transparent?: boolean;
}

export function ArtistHeader({ transparent }: ArtistHeaderProps) {
  const router = useRouter();
  const { setSearchActive } = useSearchStore();

  return (
    <header
      className={cn(
        "z-20 flex h-14 items-center justify-between pl-2 pr-1.5 transition-colors duration-300",
        transparent
          ? "bg-transparent"
          : "sticky top-0 bg-background-dark/95 backdrop-blur-md",
      )}
    >
      <button
        type="button"
        onClick={() => router.back()}
        className="flex size-11 items-center justify-center text-gray-400 transition-colors hover:text-white"
        aria-label="뒤로가기"
      >
        <ArrowLeft className="size-6" />
      </button>
      <div className="flex items-center">
        <button
          type="button"
          className="flex size-11 items-center justify-center text-gray-400 transition-colors hover:text-white"
          aria-label="검색"
          onClick={() => setSearchActive(true)}
        >
          <Search className="size-6" />
        </button>
      </div>
    </header>
  );
}
