"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useInfiniteArtists } from "@/hooks/useInfiniteArtists";
import { ArtistCard } from "./ArtistCard";

export const ArtistList = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteArtists();
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (isLoading) return <LoadingSpinner />;

  const allArtists = data?.pages.flatMap((page) => page.data) ?? [];

  if (allArtists.length === 0) {
    return <EmptyState message="아티스트가 없습니다" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {allArtists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
      <div ref={ref} className="h-20">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>
    </div>
  );
};
