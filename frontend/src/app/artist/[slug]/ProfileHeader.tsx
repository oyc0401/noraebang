"use client";

import type { ArtistDetailsDto } from "@/api/model/models";
import { Library } from "lucide-react";

interface ProfileHeaderProps {
  artist: ArtistDetailsDto;
}

export function ProfileHeader({ artist }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col p-6 w-full items-center">
      <div className="flex flex-col gap-5 items-center w-full">
        {/* Artist Thumbnail */}
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 shadow-2xl ring-4 ring-primary/20"
          style={{
            backgroundImage: `url("${
              artist.thumbnailMedium || artist.thumbnailDefault
            }")`,
          }}
        />
        {/* Artist Info */}
        <div className="flex flex-col items-center justify-center gap-1">
          <h1 className="text-slate-900 dark:text-white text-[26px] font-bold leading-tight tracking-tight text-center">
            {artist.nameKo} ({artist.name})
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20">
            <Library className="size-4 text-primary" />
            <p className="text-primary text-sm font-semibold leading-normal">
              총 {artist.songCount}곡
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
