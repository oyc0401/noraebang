"use client";

import { MoreVertical } from "lucide-react";
import Image from "next/image";
import type { KaraokeSongDto, SongDto } from "@/api/model/models";
import { KaraokeBadge } from "@/components/common/KaraokeBadge";
import { RecommendationBadge } from "@/components/common/RecommendationBadge";
import { cn } from "@/lib/cn";

interface SongListItemProps {
  song: SongDto;
  isSelected: boolean;
  onClick: () => void;
}

const RECOMMENDATION_COUNT = 0;

const getTJKaraokeNumbers = (
  karaokeSongs?: KaraokeSongDto[],
): KaraokeSongDto[] =>
  karaokeSongs?.filter(
    (item): item is KaraokeSongDto & { provider: "TJ" } =>
      item.provider === "TJ",
  ) ?? [];

export function SongListItem({ song, isSelected, onClick }: SongListItemProps) {
  const thumbnailSrc = song.thumbnailMedium ?? song.thumbnailDefault;
  const karaokeNumbers = getTJKaraokeNumbers(song.karaokeSongs);

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
      <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
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
        <div className="flex flex-wrap gap-2 pt-1">
          {karaokeNumbers.length > 0 ? (
            karaokeNumbers.map((entry) => (
              <KaraokeBadge
                key={`${entry.provider}-${entry.karaokeNo}`}
                provider={entry.provider as "TJ" | "KY"}
                number={entry.karaokeNo}
                isMR={false}
                isMV={false}
              />
            ))
          ) : (
            <RecommendationBadge count={RECOMMENDATION_COUNT} />
          )}
        </div>
      </div>
      <span className="flex size-10 items-center justify-center rounded-full text-white/60">
        <MoreVertical className="size-5" />
      </span>
    </button>
  );
}
