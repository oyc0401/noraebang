"use client";

import { useArtistsControllerFindBySlug } from "@/api/model/artists/artists";
import { SongTileCarousel } from "@/components/common/SongTileCarousel";

export function PopularProposeSongsSection() {
  const { data: artistData, isLoading } = useArtistsControllerFindBySlug(
    "aimyon",
  );

  const songs =
    artistData?.data.songs
      ?.filter((song) => song.bestSongPropose?.hit !== undefined)
      .sort(
        (a, b) =>
          (b.bestSongPropose?.hit ?? 0) - (a.bestSongPropose?.hit ?? 0),
      )
      .slice(0, 12) ?? [];

  return (
    <SongTileCarousel
      title="TJ 추천수 많은 곡"
      songs={songs}
      isLoading={isLoading}
      href="/tj/best"
    />
  );
}
