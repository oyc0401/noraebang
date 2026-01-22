"use client";

import Image from "next/image";
import type { ArtistDetailsDto } from "@/api/model/models";
import SpotifyIcon from "@/icons/spotify-filled.svg";
import YoutubeMusicIcon from "@/icons/youtube-music-filled.svg";

interface ProfileHeaderProps {
  artist: ArtistDetailsDto;
}

export function ProfileHeader({ artist }: ProfileHeaderProps) {
  const thumbnailSrc =
    artist.thumbnailHigh ?? artist.thumbnailMedium ?? artist.thumbnailDefault;

  const youtubeUrl = artist.youtube
    ? `https://music.youtube.com/channel/${artist.youtube.channelId}`
    : undefined;

  const spotifyUrl = artist.spotify
    ? (artist.spotify.spotifyUrl ??
      `https://open.spotify.com/artist/${artist.spotify.spotifyId}`)
    : undefined;

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

        {/* 외부 링크 버튼 */}
        {(youtubeUrl || spotifyUrl) && (
          <div className="flex items-center gap-1 mt-2">
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="유튜브뮤직 이동"
                className="flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95"
              >
                <Image
                  src={YoutubeMusicIcon}
                  alt="YouTube Music"
                  width={44}
                  height={44}
                />
              </a>
            )}
            {spotifyUrl && (
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="스포티파이 이동"
                className="flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95"
              >
                <Image src={SpotifyIcon} alt="Spotify" width={44} height={44} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
