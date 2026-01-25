"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ArtistDetailsDto } from "@/api/model/models";
import { ArtistCardVertical } from "@/components/common/ArtistCardVertical";

interface ArtistTileCarouselProps {
  title: string;
  artists: ArtistDetailsDto[];
  isLoading?: boolean;
  href?: string;
}

export function ArtistTileCarousel({
  title,
  artists,
  isLoading,
  href,
}: ArtistTileCarouselProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="py-4">
        <h2 className="text-white text-lg font-bold mb-3 px-4">{title}</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[100px] shrink-0 animate-pulse">
              <div className="aspect-square bg-gray-700 rounded-full" />
              <div className="mt-2 flex flex-col items-center">
                <div className="h-4 bg-gray-700 rounded w-16 mb-1" />
                <div className="h-3 bg-gray-700 rounded w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (artists.length === 0) {
    return null;
  }

  const titleContent = (
    <div className="flex items-center justify-between mb-3 px-4">
      <h2 className="text-white text-lg font-bold">{title}</h2>
      {href && <ChevronRight className="size-5 text-gray-400" />}
    </div>
  );

  return (
    <div className="py-4">
      {href ? (
        <Link href={href} className="block cursor-pointer">
          {titleContent}
        </Link>
      ) : (
        titleContent
      )}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
        {artists.map((artist) => (
          <ArtistCardVertical
            key={artist.id}
            thumbnail={artist.thumbnailMedium}
            name={artist.name}
            nameKo={artist.nameKo}
            onClick={
              artist.slug
                ? () => router.push(`/artist/${artist.slug}`)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
