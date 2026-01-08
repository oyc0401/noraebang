"use client";

import type { SongDto } from "@/api/model/models";
import { cn } from "@/lib/cn";
import { MoreVert } from "@/icons";

interface SongListItemProps {
  song: SongDto;
  isSelected: boolean;
  onClick: () => void;
}

export function SongListItem({
  song,
  isSelected,
  onClick,
}: SongListItemProps) {
  return (
    <div
      id={song.id.toString()}
      className={cn(
        "flex gap-4 px-4 py-3 items-center transition-colors rounded-xl mx-2 cursor-pointer group",
        isSelected
          ? "bg-primary/10 dark:bg-primary/20"
          : "hover:bg-black/5 dark:hover:bg-white/5",
      )}
      onClick={onClick}
    >
      <div
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg w-[72px] h-[72px] shadow-sm shrink-0"
        style={{ backgroundImage: `url("${song.thumbnailSmall}")` }}
      />
      <div className="flex flex-1 flex-col justify-center min-w-0">
        <p className="text-slate-900 dark:text-white text-base font-bold leading-normal truncate mb-0.5">
          {song.title}
        </p>
        <p className="text-slate-500 dark:text-[#b792c9] text-xs font-normal leading-normal truncate mb-2">
          {song.titleKo}
        </p>
        <div className="flex gap-2">
          {song.tj && (
            <div className="flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded text-primary border border-primary/20">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                TJ
              </span>
              <span className="text-xs font-bold font-mono">{song.tj}</span>
            </div>
          )}
          {song.ky && (
            <div className="flex items-center gap-1.5 bg-blue-500/10 dark:bg-blue-400/20 px-2 py-0.5 rounded text-blue-600 dark:text-blue-300 border border-blue-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                KY
              </span>
              <span className="text-xs font-bold font-mono">{song.ky}</span>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 flex items-center justify-center size-10 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 dark:text-slate-500 transition-colors"
      >
        <MoreVert className="size-6" />
      </button>
    </div>
  );
}
