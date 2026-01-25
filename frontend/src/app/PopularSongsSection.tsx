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
      title="최근에 나온 곡"
      songs={songs}
      isLoading={isLoading}
      href="/tj/recent"
    />
  );
}
