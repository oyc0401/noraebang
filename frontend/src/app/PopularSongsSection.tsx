"use client";

import { useSongsControllerFindBySort } from "@/api/model/songs/songs";
import { SongTileCarousel } from "@/components/common/SongTileCarousel";

export function PopularSongsSection() {
  const { data, isLoading } = useSongsControllerFindBySort({
    sort: "recent",
    limit: "12",
  });

  const songs = data?.data ?? [];

  return (
    <SongTileCarousel
      title="TJ 노래방 신곡"
      songs={songs}
      isLoading={isLoading}
      href="/tj/recent"
      source="home_recent_releases"
    />
  );
}
