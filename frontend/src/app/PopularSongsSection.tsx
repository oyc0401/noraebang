"use client";

import { useArtistsControllerFindBySlug } from "@/api/model/artists/artists";
import { SongTileCarousel } from "@/components/common/SongTileCarousel";

export function PopularSongsSection() {
  const { data: artistData, isLoading } = useArtistsControllerFindBySlug(
    "aimyon",
  );

  const songs = artistData?.data.songs?.slice(0, 12) ?? [];

  return (
    <SongTileCarousel
      title="인기있는 곡"
      songs={songs}
      isLoading={isLoading}
    />
  );
}
