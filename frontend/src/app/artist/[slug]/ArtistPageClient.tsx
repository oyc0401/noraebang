"use client";

import { useEffect, useState } from "react";
import type {
  ArtistDetailsDto,
  SongDto,
  SongListResponseDto,
} from "@/api/model/models";
import { ProfileHeader } from "./ProfileHeader";
import { ActionButtons } from "./ActionButtons";
import { SongListItem } from "./SongListItem";
import { useInfiniteQuery } from "@tanstack/react-query";
import { songsControllerFindByArtistId } from "@/api/model/songs/songs";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import { ARTIST_SONGS_PAGE_SIZE } from "./constants";
import { Header } from "@/components/common/Header";

interface ArtistPageClientProps {
  artist: ArtistDetailsDto;
  initialSongsResponse: SongListResponseDto;
}

export default function ArtistPageClient({
  artist,
  initialSongsResponse,
}: ArtistPageClientProps) {
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

  const songs = data?.pages.flatMap<SongDto>((page) => page.data ?? []) ?? [];

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

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-dark text-white shadow-xl">
      <Header />
      <ProfileHeader artist={artist} />
      <ActionButtons />

      <div className="flex items-end justify-between px-6 pt-6 pb-3">
        <h3 className="tracking-tight text-xl font-bold leading-tight text-white">
          곡 목록
        </h3>
        <span className="text-slate-400 text-xs font-medium mb-1">인기순</span>
      </div>

      <div className="flex flex-col gap-1 pb-10">
        {songs.map((song) => (
          <SongListItem
            key={song.id}
            song={song}
            isSelected={selectedSongId === song.id.toString()}
            onClick={() => {
              const newHash = `#${song.id}`;
              window.history.replaceState(null, "", newHash);
              setSelectedSongId(song.id.toString());
            }}
          />
        ))}
      </div>

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
