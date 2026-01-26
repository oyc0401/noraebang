"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SongDto } from "@/api/model/models";
import { SongCard } from "@/components/common/SongCard";
import { useSearchTracking } from "@/hooks/useSearchTracking";
import { formatSongTitle } from "@/lib/formatSongTitle";

interface SongListCarouselProps {
  title: string;
  songs: SongDto[];
  artistId?: number;
  artistTjName?: string;
  isLoading?: boolean;
  href?: string;
  source?: string;
}

export function SongListCarousel({
  title,
  songs,
  artistId,
  artistTjName,
  isLoading,
  href,
  source,
}: SongListCarouselProps) {
  const router = useRouter();
  const { saveSearchClick } = useSearchTracking();

  // 4개씩 그룹으로 나누기
  const songPages: SongDto[][] = [];
  for (let i = 0; i < songs.length; i += 4) {
    songPages.push(songs.slice(i, i + 4));
  }

  if (isLoading) {
    return (
      <div className="py-4">
        <h2 className="text-white text-lg font-bold mb-3 px-4">{title}</h2>
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

  const titleContent = (
    <div className="flex items-center justify-between mb-3 px-4">
      <h2 className="text-white text-lg font-bold">{title}</h2>
      {href && <ChevronRight className="size-5 text-gray-400" />}
    </div>
  );

  return (
    <div className="py-4">
      {href ? (
        <Link href={href} className="block cursor-pointer">
          {titleContent}
        </Link>
      ) : (
        titleContent
      )}
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {songPages.map((pageSongs, pageIndex) => (
          <div
            key={pageIndex}
            className="w-[90%] shrink-0 snap-start flex flex-col pl-2"
          >
            {pageSongs.map((song) => (
              <SongCard
                  key={song.id}
                  songId={song.id}
                  artistId={artistId}
                  artistTjName={artistTjName}
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
                  onClick={() => {
                    if (source) {
                      saveSearchClick({ songId: song.id, source });
                    }
                    router.push(`/song/${song.id}`);
                  }}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
