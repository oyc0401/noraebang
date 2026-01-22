"use client";

import { useMutation } from "@tanstack/react-query";
import { Link } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { SongDto } from "@/api/model/models";
import { searchControllerSearchSongByYoutubeUrl } from "@/api/model/search/search";
import { KaraokeBadge } from "@/components/common/KaraokeBadge";
import AppleMusicIcon from "@/icons/apple-music-filled.svg";
import SpotifyIcon from "@/icons/spotify-filled.svg";
import YoutubeMusicIcon from "@/icons/youtube-music-filled.svg";
import { isYoutubeUrl } from "@/lib/youtube";
import { useSearchStore } from "@/store/searchStore";

export function LinkPasteCard() {
  const router = useRouter();
  const { setQuery, setSearchActive } = useSearchStore();
  const [foundSong, setFoundSong] = useState<SongDto | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const youtubeMutation = useMutation({
    mutationFn: async (url: string) => {
      const result = await searchControllerSearchSongByYoutubeUrl({ url });
      return { songs: result.songs, matchedByVideoId: result.matchedByVideoId, url };
    },
    onSuccess: (data) => {
      const { songs, matchedByVideoId, url } = data;

      // 유튜브 ID로 직접 매칭 + 곡 1개일 때만 메인에 표시
      if (matchedByVideoId && songs.length === 1) {
        setFoundSong(songs[0]);
      } else {
        // 검색 쿼리로 찾았거나, 0개/여러 개면 검색 페이지로 이동
        router.push(`/search?url=${encodeURIComponent(url)}`);
      }
    },
  });

  const handlePaste = () => {
    // Clipboard API 시도
    if (navigator.clipboard?.readText) {
      navigator.clipboard
        .readText()
        .then((text) => {
          if (text.trim() && isYoutubeUrl(text)) {
            youtubeMutation.mutate(text);
          }
        })
        .catch(() => {
          // iOS Safari 등에서 실패 시 input 폴백
          if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
          }
        });
    } else {
      // Clipboard API 미지원 시 input 폴백
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.focus();
      }
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text && isYoutubeUrl(text)) {
      e.preventDefault();
      youtubeMutation.mutate(text);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  const tjSong = foundSong?.karaokeSongs?.find((ks) => ks.provider === "TJ");
  const artist = foundSong?.artists?.[0];
  const artistName = artist
    ? `${artist.nameKo} (${artist.name})`
    : "알 수 없음";
  const thumbnail =
    foundSong?.thumbnailDefault ||
    foundSong?.thumbnailMedium ||
    foundSong?.thumbnailHigh;

  const handleCardClick = () => {
    if (foundSong && artist?.slug) {
      router.push(`/artist/${artist.slug}#${foundSong.id}`);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#242026] p-4 shadow-sm ring-1 ring-surface-border">
      {/* iOS Safari를 위한 숨겨진 input */}
      <input
        ref={inputRef}
        type="text"
        onPaste={handleInputPaste}
        className="absolute opacity-0 pointer-events-none"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="relative z-10">
        {/* 곡을 찾은 경우 곡 정보 표시 */}
        {foundSong ? (
          <button
            type="button"
            className="w-full flex items-center gap-4 mb-3 cursor-pointer hover:opacity-80 transition-opacity text-left"
            onClick={handleCardClick}
          >
            {thumbnail && (
              <Image
                src={thumbnail}
                alt={foundSong.title}
                width={72}
                height={72}
                className="rounded-full shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate pb-0.5">
                {foundSong.titleKo || foundSong.title}
              </h3>
              <p className="text-sm text-surface-text truncate">{artistName}</p>
              {tjSong && (
                <div className="mt-1">
                  <KaraokeBadge provider="TJ" number={tjSong.karaokeNo} />
                </div>
              )}
            </div>
          </button>
        ) : (
          /* 기본 텍스트 */
          <p className="text-md font-medium text-surface-text leading-snug">
            <span className="text-white font-bold">음악 플랫폼 링크</span>
            를
            <br />
            붙여넣어 검색해보세요
          </p>
        )}

        {/* 하단: 아이콘과 버튼 (항상 표시) */}
        <div className="flex items-end justify-between mt-3">
          <div className="flex items-center">
            <a
              href="https://music.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center pr-2 hover:opacity-80 transition-opacity active:scale-95"
            >
              <Image
                src={YoutubeMusicIcon}
                alt="YouTube Music"
                width={44}
                height={44}
              />
            </a>
            <a
              href="https://open.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center pr-2 hover:opacity-80 transition-opacity active:scale-95"
            >
              <Image src={SpotifyIcon} alt="Spotify" width={44} height={44} />
            </a>
            <a
              href="https://music.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95"
            >
              <Image
                src={AppleMusicIcon}
                alt="Apple Music"
                width={44}
                height={44}
              />
            </a>
          </div>
          <button
            type="button"
            onClick={handlePaste}
            disabled={youtubeMutation.isPending}
            className="flex min-w-30 cursor-pointer items-center justify-center rounded-full h-11 px-5 bg-primary hover:bg-primary/90 transition-colors text-white gap-2 text-sm font-bold leading-normal shadow-lg shadow-primary/25 active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link className="size-4" />
            <span>
              {youtubeMutation.isPending ? (
                "검색 중..."
              ) : (
                <>
                  <span className="hidden min-[375px]:inline">링크 </span>
                  붙여넣기
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
