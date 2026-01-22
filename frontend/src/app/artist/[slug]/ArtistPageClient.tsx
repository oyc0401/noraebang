"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import type {
  ArtistDetailsDto,
  SongDto,
  SongListResponseDto,
} from "@/api/model/models";
import { songsControllerFindByArtistId } from "@/api/model/songs/songs";
import { Header } from "@/components/common/Header";
import { SearchOverlay } from "@/components/common/SearchOverlay";
import { SongCard } from "@/components/common/SongCard";
import { formatSongTitle } from "@/lib/formatSongTitle";
import { useSearchStore } from "@/store/searchStore";
import { ARTIST_SONGS_PAGE_SIZE } from "./constants";
import { ProfileHeader } from "./ProfileHeader";

const RECOMMENDATION_COUNT = 0;

interface ArtistPageClientProps {
  artist: ArtistDetailsDto;
  initialSongsResponse: SongListResponseDto;
}

export default function ArtistPageClient({
  artist,
  initialSongsResponse,
}: ArtistPageClientProps) {
  const { isSearchActive } = useSearchStore();
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [targetSongId, setTargetSongId] = useState<string | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["artist-songs", artist.id],
      queryFn: ({ pageParam = 0 }) =>
        songsControllerFindByArtistId(artist.id, {
          limit: `${ARTIST_SONGS_PAGE_SIZE}`,
          page: `${pageParam + 1}`,
        }),
      getNextPageParam: (lastPage, allPages) => {
        return lastPage.meta?.hasMore ? allPages.length : undefined;
      },
      initialData: {
        pages: [initialSongsResponse],
        pageParams: [0],
      },
      initialPageParam: 0,
    });

  const { ref, inView } = useInView();

  // Set initial target from hash on component mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setSelectedSongId(hash);
      setTargetSongId(hash);
    }
  }, []);

  const allSongs =
    data?.pages.flatMap<SongDto>((page) => page.data ?? []) ?? [];

  // TJ 곡이 있는 곡을 먼저 정렬
  const songs = [...allSongs].sort((a, b) => {
    const aHasTJ = a.karaokeSongs?.some((k) => k.provider === "TJ") ?? false;
    const bHasTJ = b.karaokeSongs?.some((k) => k.provider === "TJ") ?? false;

    if (aHasTJ && !bHasTJ) return -1;
    if (!aHasTJ && bHasTJ) return 1;
    return 0;
  });

  // Effect for handling scrolling to a target song from a hash
  useEffect(() => {
    if (targetSongId) {
      const songExists = songs.some((s) => s.id.toString() === targetSongId);
      if (songExists) {
        // If song is found in the list, scroll to it and clear the target
        const element = document.getElementById(targetSongId);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            setTargetSongId(null);
          }, 100);
        }
      } else if (hasNextPage && !isFetchingNextPage) {
        // If song is not found, fetch the next page
        fetchNextPage();
      }
    }
  }, [songs, targetSongId, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Effect for standard infinite scrolling when user scrolls to the bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !targetSongId) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, targetSongId]);

  const showRecommendationButton = !isLoading && songs.length === 0;

  if (isSearchActive) {
    return <SearchOverlay />;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white">
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header transparent />
        </div>
        <ProfileHeader artist={artist} />
      </div>

      <div className="flex items-end justify-between px-6 pt-6 pb-3">
        <h3 className="tracking-tight text-xl font-bold leading-tight text-white">
          곡 목록
        </h3>
        <span className="text-slate-400 text-xs font-medium mb-1">인기순</span>
      </div>

      {songs.length > 0 && (
        <div className="flex flex-col pb-10 px-2">
          {songs.map((song) => {
            const tjNumber = song.karaokeSongs?.find(
              (k) => k.provider === "TJ",
            )?.karaokeNo;
            return (
              <SongCard
                key={song.id}
                id={song.id.toString()}
                thumbnail={song.thumbnailMedium}
                title={formatSongTitle(
                  song.title,
                  song.titleKo,
                  song.titleJa,
                  song.titleLatin,
                )}
                subtitle={song.artists.map((a) => a.name).join(", ")}
                tjNumber={tjNumber}
                isSelected={selectedSongId === song.id.toString()}
                onClick={() => {
                  const newHash = `#${song.id}`;
                  window.history.replaceState(null, "", newHash);
                  setSelectedSongId(song.id.toString());
                }}
              />
            );
          })}
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

      <div ref={ref} className="h-20 flex items-center justify-center">
        {isFetchingNextPage && (
          <Loader2 className="size-6 animate-spin text-white" />
        )}
        {!hasNextPage && !isLoading && songs.length > 0 && (
          <p className="text-sm text-white/60">모든 곡을 불러왔습니다.</p>
        )}
      </div>
    </div>
  );
}
