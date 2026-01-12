"use client";

import type { ManagerArtistSummary } from "../types";

type ArtistCardProps = {
  artist: ManagerArtistSummary;
  selected: boolean;
  onSelect: (artistId: number) => void;
};

export function ArtistCard({ artist, selected, onSelect }: ArtistCardProps) {
  const displayCatalog =
    artist.catalog && artist.catalog.trim().length
      ? artist.catalog.toUpperCase()
      : "미분류";
  const popularityLabel =
    typeof artist.popularity === "number" ? artist.popularity : "-";

  return (
    <button
      id={`artist-card-${artist.id}`}
      type="button"
      onClick={() => onSelect(artist.id)}
      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer ${
        selected ? "border-blue-500 bg-blue-50" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-zinc-100">
        {artist.thumbnailDefault ? (
          <img
            src={artist.thumbnailDefault}
            alt={artist.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-600">
            {artist.name.at(0)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-zinc-900">
              {artist.name}
              {artist.nameKo && (
                <span className="ml-1 text-zinc-500">({artist.nameKo})</span>
              )}
            </p>
            <p className="text-xs text-zinc-500">
              {artist.nameJa}
              {artist.nameLatin && (
                <span className="ml-1 text-zinc-400">{artist.nameLatin}</span>
              )}
            </p>
          </div>
          <span className="text-xs font-medium text-zinc-500">
            #{artist.id}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5">
            {displayCatalog}
          </span>
          <span>곡수 {artist.songCount.toLocaleString()}</span>
          <span>스포티파이 인기 {popularityLabel}</span>
        </div>
      </div>
    </button>
  );
}
