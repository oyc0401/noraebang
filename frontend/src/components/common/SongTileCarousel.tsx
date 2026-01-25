"use client";

import type { SongDto } from "@/api/model/models";
import { SongCardVertical } from "@/components/common/SongCardVertical";
import { formatSongTitle } from "@/lib/formatSongTitle";

interface SongTileCarouselProps {
  title: string;
  songs: SongDto[];
  isLoading?: boolean;
}

export function SongTileCarousel({
  title,
  songs,
  isLoading,
}: SongTileCarouselProps) {
  if (isLoading) {
    return (
      <div className="py-4">
        <h2 className="text-white text-lg font-bold mb-3 px-4">{title}</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[140px] shrink-0 animate-pulse">
              <div className="aspect-square bg-gray-700 rounded-md" />
              <div className="mt-2">
                <div className="h-4 bg-gray-700 rounded mb-1" />
                <div className="h-3 bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return null;
  }

  return (
    <div className="py-4">
      <h2 className="text-white text-lg font-bold mb-3 px-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
        {songs.map((song) => (
          <SongCardVertical
            key={song.id}
            thumbnail={song.thumbnailMedium}
            title={formatSongTitle(
              song.title,
              song.titleKo,
              song.titleJa,
              song.titleLatin,
            )}
            subtitle={song.artists.map((a) => a.name).join(", ")}
            tjNumber={song.tjSong?.id}
            bestProposeHit={song.bestSongPropose?.hit}
          />
        ))}
      </div>
    </div>
  );
}
