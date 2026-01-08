"use client";

import Image from "next/image";
import type { KaraokeSongDto, SongDto } from "@/api/model/models";
import { cn } from "@/lib/cn";
import { MoreVertical } from "lucide-react";

interface SongListItemProps {
  song: SongDto;
  isSelected: boolean;
  onClick: () => void;
}

const getKaraokeNumbers = (
  karaokeSongs?: KaraokeSongDto[],
): KaraokeSongDto[] =>
  karaokeSongs?.filter(
    (item): item is KaraokeSongDto & { provider: "TJ" | "KY" } =>
      item.provider === "TJ" || item.provider === "KY",
  ) ?? [];

export function SongListItem({
  song,
  isSelected,
  onClick,
}: SongListItemProps) {
  const thumbnailSrc = song.thumbnailMedium ?? song.thumbnailDefault;
  const karaokeNumbers = getKaraokeNumbers(song.karaokeSongs);

  return (
    <button
      type="button"
      id={song.id.toString()}
      onClick={onClick}
      className={cn(
        "mx-2 flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors",
        "bg-zinc-900/70 border-transparent hover:border-white/10",
        isSelected && "border-primary/60 bg-primary/20",
      )}
    >
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt={song.titleKo ?? song.title}
            fill
            sizes="72px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-white/40">
            🎵
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="truncate text-base font-bold leading-normal text-white">
          {song.title}
        </p>
        {song.titleKo && (
          <p className="truncate text-xs text-white/60">{song.titleKo}</p>
        )}
        {karaokeNumbers.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {karaokeNumbers.map((entry) => (
              <div
                key={`${entry.provider}-${entry.karaokeNo}`}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-0.5 border text-xs font-bold font-mono",
                  entry.provider === "TJ"
                    ? "border-primary/30 bg-primary/15 text-primary"
                    : "border-blue-500/40 bg-blue-500/10 text-blue-200",
                )}
              >
                <span className="text-[10px] uppercase tracking-widest">
                  {entry.provider}
                </span>
                <span>{entry.karaokeNo}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <span className="flex size-10 items-center justify-center rounded-full text-white/60">
        <MoreVertical className="size-5" />
      </span>
    </button>
  );
}
