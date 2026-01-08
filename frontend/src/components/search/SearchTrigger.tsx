"use client";

import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchTriggerProps {
  value?: string;
  placeholder?: string;
  className?: string;
  onClick?: () => void;
  onClear?: () => void;
}

export function SearchTrigger({
  value,
  placeholder = "제목, 가수, 번호 검색...",
  className,
  onClick,
  onClear,
}: SearchTriggerProps) {
  const hasValue = !!value && value.trim().length > 0;

  return (
    <div
      className={cn(
        "flex w-full items-center rounded-xl h-11 bg-surface-dark shadow-sm ring-1 ring-white/10 overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 items-center transition-all hover:ring-primary cursor-pointer"
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
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center justify-center pr-4 text-[#6B7280] hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  );
}
