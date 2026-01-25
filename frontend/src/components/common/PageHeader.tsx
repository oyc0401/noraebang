"use client";

import { ArrowLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchStore } from "@/store/searchStore";

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  const router = useRouter();
  const { setSearchActive } = useSearchStore();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-background-dark/95 backdrop-blur-md pl-2 pr-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center text-gray-400 transition-colors hover:text-white cursor-pointer"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
      </div>
      <button
        type="button"
        className="flex size-11 items-center justify-center text-gray-400 transition-colors hover:text-white cursor-pointer"
        aria-label="검색"
        onClick={() => setSearchActive(true)}
      >
        <Search className="size-6" />
      </button>
    </header>
  );
}
