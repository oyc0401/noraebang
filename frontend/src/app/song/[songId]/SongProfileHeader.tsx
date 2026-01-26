"use client";

import Image from "next/image";
import Link from "next/link";
import type { SongDto } from "@/api/model/models";
import SpotifyIcon from "@/icons/spotify-filled.svg";
import YoutubeMusicIcon from "@/icons/youtube-music-filled.svg";
import { formatSongTitle } from "@/lib/formatSongTitle";

interface SongProfileHeaderProps {
  song: SongDto;
}

export function SongProfileHeader({ song }: SongProfileHeaderProps) {
  const thumbnailSrc =
    song.thumbnailHigh ?? song.thumbnailMedium ?? song.thumbnailDefault;

  const youtubeUrl = song.youtube
    ? `https://music.youtube.com/watch?v=${song.youtube.videoId}`
    : undefined;

  const spotifyUrl = song.spotify
    ? `https://open.spotify.com/track/${song.spotify.spotifyId}`
    : undefined;

  const formattedTitle = formatSongTitle(
    song.title,
    song.titleKo,
    song.titleJa,
    song.titleLatin,
  );

  const mainArtist =
    song.artists.find((a) => a.role === "MAIN") ?? song.artists[0];
  const artistDisplayName = mainArtist
    ? mainArtist.nameKo || mainArtist.name
    : song.artists.map((a) => a.nameKo || a.name).join(", ");

  const formatViewCount = (count: number): string => {
    if (count >= 100000000) {
      return `${Math.floor(count / 100000000)}억회`;
    }
    if (count >= 10000) {
      return `${Math.floor(count / 10000)}만회`;
    }
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}천회`;
    }
    return `${count}회`;
  };

  return (
    <div className="relative w-full aspect-[4/3]">
      {/* 배너 배경 이미지 */}
      {thumbnailSrc && (
        <Image
          src={thumbnailSrc}
          alt={`${formattedTitle} 썸네일`}
          fill
          className="object-cover"
          priority
          unoptimized
        />
      )}

      {/* 아래쪽 그라데이션 + 블러 오버레이 */}
      <div className="absolute inset-x-0 top-0 -bottom-px bg-gradient-to-t from-background-dark via-background-dark/60 via-35% to-transparent" />

      {/* 곡 정보 */}
      <div className="absolute bottom-6 left-6 right-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-white">
          {formattedTitle}
        </h1>
        {mainArtist ? (
          <Link
            href={`/artist/${mainArtist.slug ?? mainArtist.artistId}`}
            className="text-md text-white/70 hover:text-white transition-colors"
          >
            {artistDisplayName}
          </Link>
        ) : (
          <p className="text-md text-white/70">{artistDisplayName}</p>
        )}

        {/* YouTube 조회수 및 발매년도 */}
        {song.youtube &&
          (song.youtube.viewCount || song.youtube.publishedYear) && (
            <p className="text-sm text-white/50 mt-1">
              {song.youtube.viewCount &&
                formatViewCount(song.youtube.viewCount)}
              {song.youtube.viewCount && song.youtube.publishedYear && " · "}
              {song.youtube.publishedYear && `${song.youtube.publishedYear}년`}
            </p>
          )}

        {/* 외부 링크 버튼 */}
        {(youtubeUrl || spotifyUrl) && (
          <div className="flex items-center gap-1 mt-2">
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="유튜브뮤직에서 듣기"
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
                aria-label="스포티파이에서 듣기"
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
