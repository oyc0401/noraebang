"use client";

import Image from "next/image";
import type { ArtistDetailsDto } from "@/api/model/models";

interface ProfileHeaderProps {
  artist: ArtistDetailsDto;
}

export function ProfileHeader({ artist }: ProfileHeaderProps) {
  const thumbnailSrc =
    artist.thumbnailHigh ?? artist.thumbnailMedium ?? artist.thumbnailDefault;

  return (
    <div className="relative w-full aspect-[4/3]">
      {/* 배너 배경 이미지 */}
      {thumbnailSrc && (
        <Image
          src={thumbnailSrc}
          alt={`${artist.nameKo} 배너`}
          fill
          className="object-cover"
          priority
        />
      )}

      {/* 아래쪽 그라데이션 + 블러 오버레이 */}
      <div className="absolute inset-x-0 top-0 -bottom-px bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent" />

      {/* 아티스트 이름 */}
      <div className="absolute bottom-6 left-6 right-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-white">
          {artist.nameKo}
        </h1>
        <p className="text-md text-white/70">{artist.name}</p>
        <button aria-label="유튜브뮤직 이동"></button>
        <button aria-label="스포티파이 이동"></button>
      </div>
    </div>
  );
}
