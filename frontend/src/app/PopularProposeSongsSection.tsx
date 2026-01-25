"use client";

import { useArtistsControllerFindBySlug } from "@/api/model/artists/artists";
import { SongListCarousel } from "@/components/common/SongListCarousel";

export function PopularProposeSongsSection() {
  const { data: artistData, isLoading } = useArtistsControllerFindBySlug(
    "aimyon",
  );

  const artist = artistData?.data;
  const songs =
    artist?.songs
      ?.filter((song) => song.bestSongPropose?.hit !== undefined)
      .sort(
        (a, b) =>
          (b.bestSongPropose?.hit ?? 0) - (a.bestSongPropose?.hit ?? 0),
      )
      .slice(0, 12) ?? [];

  return (
    <SongListCarousel
      title="TJ 추천수 많은 곡"
      songs={songs}
      artistId={artist?.id}
      artistTjName={artist?.tjName}
      isLoading={isLoading}
    />
  );
}
