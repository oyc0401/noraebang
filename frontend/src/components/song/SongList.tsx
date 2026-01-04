"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useInfiniteSongs } from "@/hooks/useInfiniteSongs";
import { SongCard } from "./SongCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";

interface Props {
  artistId: number;
}

export const SongList = ({ artistId }: Props) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteSongs(artistId);
  const { ref, inView } = useInView();
  const [selectedSongId, setSelectedSongId] = useState<string>();

  // 해시 라우팅
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setSelectedSongId(hash);
      setTimeout(() => {
        document
          .getElementById(hash)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-center text-red-400 p-8">
        에러가 발생했습니다: {error instanceof Error ? error.message : "알 수 없는 에러"}
      </div>
    );
  }

  const allSongs = data?.pages.flatMap((page) => page.data) ?? [];

  if (allSongs.length === 0) {
    return <EmptyState message="곡이 없습니다" icon="🎵" />;
  }

  return (
    <div className="space-y-2">
      {allSongs.map((song) => (
        <div key={song.id} id={song.id.toString()}>
          <SongCard
            song={song}
            isSelected={selectedSongId === song.id.toString()}
            onClick={() => {
              setSelectedSongId(song.id.toString());
              window.history.replaceState(null, "", `#${song.id}`);
            }}
          />
        </div>
      ))}
      <div ref={ref} className="h-20">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>
    </div>
  );
};
