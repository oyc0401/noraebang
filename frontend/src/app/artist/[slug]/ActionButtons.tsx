"use client";

import { cn } from "@/lib/cn";
import {
  AddCircle,
  Apple,
  GraphicEq,
  MusicNote,
  SmartDisplay,
} from "@/icons";

export function ActionButtons() {
  return (
    <div className="w-full overflow-x-auto no-scrollbar pb-4 pt-2">
      <div className="flex gap-3 px-4 w-max">
        {/* Add Artist TJ */}
        <button
          type="button"
          className={cn(
            "group flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full",
            "bg-primary text-white pl-3 pr-5",
            "active:scale-95 transition-all shadow-lg shadow-primary/25",
          )}
        >
          <AddCircle className="size-5" />
          <span className="text-sm font-bold leading-normal">
            아티스트 TJ 추가
          </span>
        </button>
        {/* YouTube */}
        <button
          type="button"
          className={cn(
            "group flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full",
            "bg-white dark:bg-[#3c2348] border border-gray-200 dark:border-transparent",
            "pl-3 pr-5 active:scale-95 transition-all",
          )}
        >
          <SmartDisplay className="size-5 text-red-500 dark:text-white" />
          <span className="text-slate-700 dark:text-white text-sm font-medium leading-normal">
            YouTube
          </span>
        </button>
        {/* Spotify */}
        <button
          type="button"
          className={cn(
            "group flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full",
            "bg-white dark:bg-[#3c2348] border border-gray-200 dark:border-transparent",
            "pl-3 pr-5 active:scale-95 transition-all",
          )}
        >
          <GraphicEq className="size-5 text-green-500 dark:text-white" />
          <span className="text-slate-700 dark:text-white text-sm font-medium leading-normal">
            Spotify
          </span>
        </button>
        {/* Apple Music */}
        <button
          type="button"
          className={cn(
            "group flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full",
            "bg-white dark:bg-[#3c2348] border border-gray-200 dark:border-transparent",
            "pl-3 pr-5 active:scale-95 transition-all",
          )}
        >
          <MusicNote className="size-5 text-pink-500 dark:text-white" />
          <span className="text-slate-700 dark:text-white text-sm font-medium leading-normal">
            Apple Music
          </span>
        </button>
      </div>
    </div>
  );
}
