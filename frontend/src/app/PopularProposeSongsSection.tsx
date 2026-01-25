"use client";

import { useArtistsControllerFindBySlug } from "@/api/model/artists/artists";
import { SongCard } from "@/components/common/SongCard";
import { formatSongTitle } from "@/lib/formatSongTitle";

export function PopularProposeSongsSection() {
  const { data: artistData, isLoading } = useArtistsControllerFindBySlug(
    "aimyon",
  );

  const artist = artistData?.data;
  // 추천수 기준 정렬 후 12개
  const songs =
    artist?.songs
      ?.filter((song) => song.bestSongPropose?.hit !== undefined)
      .sort((a, b) => (b.bestSongPropose?.hit ?? 0) - (a.bestSongPropose?.hit ?? 0))
      .slice(0, 12) ?? [];

  // 4개씩 그룹으로 나누기
  const songPages: typeof songs[] = [];
  for (let i = 0; i < songs.length; i += 4) {
    songPages.push(songs.slice(i, i + 4));
  }

  if (isLoading) {
    return (
      <div className="py-4">
        <h2 className="text-white text-lg font-bold mb-3 px-4">
          TJ 추천수 많은 곡
        </h2>
        <div className="flex flex-col gap-1 px-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-2 py-2">
              <div className="w-14 h-14 bg-gray-700 rounded-sm animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded mb-2 w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse" />
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
      <h2 className="text-white text-lg font-bold mb-3 px-4">
        TJ 추천수 많은 곡
      </h2>
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {songPages.map((pageSongs, pageIndex) => (
          <div
            key={pageIndex}
            className="w-[90%] shrink-0 snap-start flex flex-col pl-2"
          >
            {pageSongs.map((song) => {
              const tjNumber = song.tjSong?.id;
              return (
                <SongCard
                  key={song.id}
                  songId={song.id}
                  artistId={artist?.id}
                  artistTjName={artist?.tjName}
                  thumbnail={song.thumbnailMedium}
                  title={formatSongTitle(
                    song.title,
                    song.titleKo,
                    song.titleJa,
                    song.titleLatin,
                  )}
                  originalTitle={song.title}
                  subtitle={song.artists.map((a) => a.name).join(", ")}
                  tjNumber={tjNumber}
                  bestProposeHit={song.bestSongPropose?.hit}
                  spotify={song.spotify}
                  youtube={song.youtube}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
