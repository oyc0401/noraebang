"use client";

import { CircleThumbnail } from "@/components/common/CircleThumbnail";
import type { ArtistDetailsDto } from "@/api/model/models";
import { Library } from "lucide-react";

interface ProfileHeaderProps {
  artist: ArtistDetailsDto;
}

export function ProfileHeader({ artist }: ProfileHeaderProps) {
  const thumbnailSrc = artist.thumbnailMedium ?? artist.thumbnailDefault;

  return (
    <div className="flex flex-col p-6 w-full items-center text-white">
      <div className="flex flex-col gap-5 items-center w-full">
        <div className="rounded-full ring-4 ring-primary/25 p-1 shadow-2xl">
          <CircleThumbnail
            src={thumbnailSrc}
            alt={`${artist.nameKo} 썸네일`}
            size="w-32 h-32"
            className="shadow-lg"
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">
            {artist.nameKo} ({artist.name})
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-sm font-semibold leading-normal">
            <Library className="size-4" />
            <p>총 {artist.songCount ?? 0}곡</p>
          </div>
        </div>
      </div>
    </div>
  );
}
