"use client";

import { useSongsControllerFindBySort } from "@/api/model/songs/songs";
import { SongListCarousel } from "@/components/common/SongListCarousel";

export function RecentSongsSection() {
  const { data, isLoading } = useSongsControllerFindBySort({
    sort: "popular",
    limit: "12",
  });

  const songs = data?.data ?? [];

  return (
    <SongListCarousel
      title="인기있는 곡"
      songs={songs}
      isLoading={isLoading}
      href="/popular/song"
      source="home_popular_songs"
    />
  );
}
