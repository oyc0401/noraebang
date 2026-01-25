"use client";

import { useArtistsControllerFindMostViewed } from "@/api/model/artists/artists";
import { ArtistTileCarousel } from "@/components/common/ArtistTileCarousel";

export function PopularArtistsSection() {
  const { data, isLoading } = useArtistsControllerFindMostViewed({
    limit: "12",
  });

  const artists = data?.data ?? [];

  return (
    <ArtistTileCarousel
      title="인기 아티스트"
      artists={artists}
      isLoading={isLoading}
      href="/popular/artist"
    />
  );
}
