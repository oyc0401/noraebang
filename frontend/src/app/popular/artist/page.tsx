"use client";

import { useRouter } from "next/navigation";
import { useArtistsControllerFindMostViewed } from "@/api/model/artists/artists";
import { ArtistCard } from "@/components/common/ArtistCard";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchOverlay } from "@/components/common/SearchOverlay";
import { useSearchStore } from "@/store/searchStore";

export default function PopularArtistPage() {
  const router = useRouter();
  const { isSearchActive } = useSearchStore();
  const { data, isLoading } = useArtistsControllerFindMostViewed({
    limit: "100",
  });

  const artists = data?.data ?? [];

  if (isSearchActive) {
    return <SearchOverlay />;
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <PageHeader title="인기 아티스트" />
      <main className="px-2 pb-10">
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-2 py-2">
                <div className="w-14 h-14 bg-gray-700 rounded-full animate-pulse shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2 w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                thumbnail={artist.thumbnailMedium}
                title={artist.name}
                subtitle={artist.nameKo}
                onClick={
                  artist.slug
                    ? () => router.push(`/artist/${artist.slug}`)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
