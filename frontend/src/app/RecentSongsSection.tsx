"use client";

import { useArtistsControllerFindBySlug } from "@/api/model/artists/artists";
import { SongListCarousel } from "@/components/common/SongListCarousel";

export function RecentSongsSection() {
  const { data: artistData, isLoading } = useArtistsControllerFindBySlug(
    "aimyon",
  );

  const artist = artistData?.data;
  const songs = artist?.songs?.slice(0, 12) ?? [];

  return (
    <SongListCarousel
      title="인기있는 곡"
      songs={songs}
      artistId={artist?.id}
      artistTjName={artist?.tjName}
      isLoading={isLoading}
      href="/popular/song"
    />
  );
}
