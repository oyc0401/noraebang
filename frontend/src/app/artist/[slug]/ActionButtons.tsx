"use client";

import { cn } from "@/lib/cn";
import { AudioLines, Music2, PlusCircle, Youtube } from "lucide-react";

const secondaryButtonClass = cn(
  "group flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full",
  "px-3 pr-5 border border-white/10 bg-white/5 text-white transition-all",
  "hover:bg-white/10 active:scale-95",
);

export function ActionButtons() {
  return (
    <div className="w-full overflow-x-auto no-scrollbar pb-4 pt-2">
      <div className="flex gap-3 px-4 w-max">
        <button
          type="button"
          className={cn(
            "group flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full",
            "bg-primary px-3 pr-5 text-white font-semibold shadow-lg shadow-primary/30",
            "transition-all active:scale-95",
          )}
        >
          <PlusCircle className="size-5" />
          <span className="text-sm leading-normal">아티스트 TJ 추가</span>
        </button>
        <button type="button" className={secondaryButtonClass}>
          <Youtube className="size-5 text-red-400" />
          <span className="text-sm font-medium leading-normal">YouTube</span>
        </button>
        <button type="button" className={secondaryButtonClass}>
          <AudioLines className="size-5 text-green-400" />
          <span className="text-sm font-medium leading-normal">Spotify</span>
        </button>
        <button type="button" className={secondaryButtonClass}>
          <Music2 className="size-5 text-pink-400" />
          <span className="text-sm font-medium leading-normal">
            Apple Music
          </span>
        </button>
      </div>
    </div>
  );
}
