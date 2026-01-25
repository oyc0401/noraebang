"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SongDto } from "@/api/model/models";
import { SongCardVertical } from "@/components/common/SongCardVertical";
import { useSearchTracking } from "@/hooks/useSearchTracking";
import { formatSongTitle } from "@/lib/formatSongTitle";

interface SongTileCarouselProps {
  title: string;
  songs: SongDto[];
  isLoading?: boolean;
  href?: string;
  source?: string;
}

export function SongTileCarousel({
  title,
  songs,
  isLoading,
  href,
  source,
}: SongTileCarouselProps) {
  const router = useRouter();
  const { saveSearchClick } = useSearchTracking();
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
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
        {songs.map((song) => {
          const artistSlug = song.artists[0]?.slug;
          return (
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
              onClick={
                artistSlug
                  ? () => {
                      if (source) {
                        saveSearchClick({ songId: song.id, source });
                      }
                      router.push(`/artist/${artistSlug}#${song.id}`);
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
