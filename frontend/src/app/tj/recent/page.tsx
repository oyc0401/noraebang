"use client";

import { useSongsControllerFindBySort } from "@/api/model/songs/songs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchOverlay } from "@/components/common/SearchOverlay";
import { SongCard } from "@/components/common/SongCard";
import { formatSongTitle } from "@/lib/formatSongTitle";
import { useSearchStore } from "@/store/searchStore";

export default function TjRecentPage() {
  const { isSearchActive } = useSearchStore();
  const { data, isLoading } = useSongsControllerFindBySort({
    sort: "recent",
    limit: "100",
  });

  const songs = data?.data ?? [];

  if (isSearchActive) {
    return <SearchOverlay />;
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <PageHeader title="최근에 나온 곡" />
      <main className="px-2 pb-10">
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-2 py-2">
                <div className="w-14 h-14 bg-gray-700 rounded-sm animate-pulse shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2 w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                songId={song.id}
                thumbnail={song.thumbnailMedium}
                title={formatSongTitle(
                  song.title,
                  song.titleKo,
                  song.titleJa,
                  song.titleLatin,
                )}
                originalTitle={song.title}
                subtitle={song.artists.map((a) => a.name).join(", ")}
                tjNumber={song.tjSong?.id}
                bestProposeHit={song.bestSongPropose?.hit}
                spotify={song.spotify}
                youtube={song.youtube}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
