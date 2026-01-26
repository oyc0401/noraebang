"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import type { ArtistDetailsDto } from "@/api/model/models";
import { ArtistHeader } from "@/app/artist/[slug]/ArtistHeader";
import { SearchOverlay } from "@/components/common/SearchOverlay";
import { SongCard } from "@/components/common/SongCard";
import { formatSongTitle } from "@/lib/formatSongTitle";
import { useSearchStore } from "@/store/searchStore";
import { ProfileHeader } from "./ProfileHeader";

const RECOMMENDATION_COUNT = 0;

interface ArtistPageClientProps {
  artist: ArtistDetailsDto;
}

export default function ArtistPageClient({ artist }: ArtistPageClientProps) {
  const router = useRouter();
  const { isSearchActive } = useSearchStore();
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  const { ref: headerRef, inView: isHeaderVisible } = useInView();

  const songs = artist.songs ?? [];

  // Set initial target from hash on component mount and scroll to it
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setSelectedSongId(hash);
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, []);

  const showRecommendationButton = songs.length === 0;

  if (isSearchActive) {
    return <SearchOverlay />;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white">
      <div className="fixed top-0 left-0 right-0 z-20 max-w-lg mx-auto">
        <ArtistHeader transparent={isHeaderVisible} />
      </div>
      <ProfileHeader artist={artist} />
      <div ref={headerRef} />

      <div className="flex items-end justify-between px-6 pt-6 pb-3">
        <h3 className="tracking-tight text-xl font-bold leading-tight text-white">
          곡 목록
        </h3>
        <span className="text-slate-400 text-xs font-medium mb-1">인기순</span>
      </div>

      {songs.length > 0 && (
        <div className="flex flex-col pb-10 px-2">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              id={song.id.toString()}
              songId={song.id}
              artistId={artist.id}
              artistTjName={artist.tjName}
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
              isSelected={selectedSongId === song.id.toString()}
              onClick={() => {
                router.push(`/song/${song.id}`);
              }}
            />
          ))}
        </div>
      )}

      {showRecommendationButton && (
        <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-12 text-center text-white/70">
          <p className="text-sm">등록된 TJ 곡이 없어요.</p>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary"
          >
            <span>추천하기</span>
            <span>{RECOMMENDATION_COUNT}</span>
          </button>
        </div>
      )}
    </div>
  );
}
