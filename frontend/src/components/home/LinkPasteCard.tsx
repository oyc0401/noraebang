"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import YoutubeMusicIcon from "@/icons/youtube-music.svg";
import SpotifyIcon from "@/icons/spotify.svg";
import AppleMusicIcon from "@/icons/apple-music.svg";
import { isYoutubeUrl } from "@/lib/youtube";
import { searchControllerSearchSongByYoutubeUrl } from "@/api/model/search/search";
import { useSearchStore } from "@/store/searchStore";
import type { SongDto } from "@/api/model/models";
import { KaraokeBadge } from "@/components/common/KaraokeBadge";

export function LinkPasteCard() {
  const { setQuery, setSearchActive } = useSearchStore();
  const [foundSong, setFoundSong] = useState<SongDto | undefined>(undefined);

  const youtubeMutation = useMutation({
    mutationFn: async (url: string) => {
      return searchControllerSearchSongByYoutubeUrl({ url });
    },
    onSuccess: (data) => {
      // DB에서 곡을 찾은 경우
      if (data.song) {
        setFoundSong(data.song);
      }
      // DB에서 곡을 찾지 못한 경우
      else if (data.youtube) {
        const { title, authorName } = data.youtube;
        setQuery(`${title} ${authorName}`.trim());
        setSearchActive(true);
      }
    },
  });

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();

      if (!text.trim()) {
        return;
      }

      if (isYoutubeUrl(text)) {
        youtubeMutation.mutate(text);
      }
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  const tjSong = foundSong?.karaokeSongs?.find((ks) => ks.provider === "TJ");
  const artistName = foundSong?.artists?.[0]?.name || "알 수 없음";
  const thumbnail =
    foundSong?.thumbnailDefault ||
    foundSong?.thumbnailMedium ||
    foundSong?.thumbnailHigh;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-dark p-4 shadow-sm ring-1 ring-surface-border">
      <div className="relative z-10">
        {/* 곡을 찾은 경우 곡 정보 표시 */}
        {foundSong ? (
          <div className="flex items-center gap-4 mb-3">
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
              <h3 className="text-base font-bold text-white truncate">
                {foundSong.titleKo || foundSong.title}
              </h3>
              <p className="text-sm text-surface-text truncate">{artistName}</p>
              {tjSong && (
                <div className="mt-1">
                  <KaraokeBadge provider="TJ" number={tjSong.karaokeNo} />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 기본 텍스트 */
          <p className="text-sm font-medium text-surface-text leading-snug">
            <span className="text-white font-bold">음악 플랫폼 링크</span>
            를
            <br />
            붙여넣어 검색해보세요
          </p>
        )}

        {/* 하단: 아이콘과 버튼 (항상 표시) */}
        <div className="flex items-end justify-between">
          <div className="flex items-center pl-1 ">
            <div className="  flex items-center justify-center pr-1.5">
              <Image
                src={YoutubeMusicIcon}
                alt="YouTube Music"
                width={32}
                height={32}
              />
            </div>
            <div className=" flex items-center justify-center  pr-1.5">
              <Image src={SpotifyIcon} alt="Spotify" width={32} height={32} />
            </div>
            <div className=" flex items-center justify-center">
              <Image
                src={AppleMusicIcon}
                alt="Apple Music"
                width={32}
                height={32}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handlePaste}
            disabled={youtubeMutation.isPending}
            className="flex min-w-30 cursor-pointer items-center justify-center rounded-full h-11 px-5 bg-primary hover:bg-primary/90 transition-colors text-white gap-2 text-sm font-bold leading-normal shadow-lg shadow-primary/25 active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link className="size-4" />
            <span>
              {youtubeMutation.isPending ? "검색 중..." : "링크 붙여넣기"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
