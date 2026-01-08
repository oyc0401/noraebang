"use client";

import { Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchTriggerProps {
  value?: string;
  placeholder?: string;
  className?: string;
  onClick?: () => void;
}

export function SearchTrigger({
  value,
  placeholder = "제목, 가수, 번호 검색...",
  className,
  onClick,
}: SearchTriggerProps) {
  const hasValue = !!value && value.trim().length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-xl h-14 bg-surface-dark shadow-sm ring-1 ring-white/10 overflow-hidden transition-all hover:ring-2 hover:ring-primary cursor-pointer",
        className,
      )}
    >
      <div className="flex items-center justify-center pl-4 text-[#6B7280]">
        <SearchIcon className="size-5" />
      </div>
      <div
        className={cn(
          "flex-1 text-left px-3 text-base truncate",
          hasValue ? "text-white" : "text-[#6B7280]",
        )}
      >
        {hasValue ? value : placeholder}
      </div>
    </button>
  );
}
