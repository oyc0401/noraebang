"use client";

import { useSongsControllerFindBySort } from "@/api/model/songs/songs";
import { SongTileCarousel } from "@/components/common/SongTileCarousel";

export function PopularProposeSongsSection() {
  const { data, isLoading } = useSongsControllerFindBySort({
    sort: "tj_recommend",
    limit: "12",
  });

  const songs = data?.data ?? [];

  return (
    <SongTileCarousel
      title="TJ 추천수 많은 곡"
      songs={songs}
      isLoading={isLoading}
      href="/tj/best"
      source="home_tj_recommendations"
    />
  );
}
