"use client";

import { useArtistsControllerFindBySlug } from "@/api/model/artists/artists";
import { SongCardVertical } from "@/components/common/SongCardVertical";
import { formatSongTitle } from "@/lib/formatSongTitle";

export function PopularSongsSection() {
  const { data: artistData, isLoading } = useArtistsControllerFindBySlug(
    "aimyon",
  );

  const songs = artistData?.data.songs?.slice(0, 12) ?? [];

  if (isLoading) {
    return (
      <div className="py-4">
        <h2 className="text-white text-lg font-bold mb-3 px-4">인기있는 곡</h2>
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
      <h2 className="text-white text-lg font-bold mb-3 px-4">인기있는 곡</h2>
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
