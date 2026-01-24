"use client";

import { Pencil, SendHorizonal, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import SpotifyIcon from "@/icons/spotify-filled.svg";
import YoutubeMusicIcon from "@/icons/youtube-music-filled.svg";
import { cn } from "@/lib/cn";
import { useSongMenuStore } from "@/store/songMenuStore";

export function SongMenuBottomSheet() {
  const { isOpen, song, closeMenu } = useSongMenuStore();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 마운트/언마운트 및 애니메이션 관리
  useEffect(() => {
    if (isOpen && song) {
      setMounted(true);
      // 다음 프레임에서 애니메이션 시작
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      // 애니메이션 완료 후 언마운트
      const timer = setTimeout(() => {
        setMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, song]);

  // 바텀시트가 열릴 때 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !song) return null;

  const hasTjNumber = !!song.tjNumber;

  return (
    <>
      {/* 오버레이 */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={closeMenu}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeMenu();
        }}
      />

      {/* 바텀시트 */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto bg-[#1a1a1a] rounded-t-2xl transition-transform duration-300 ease-out",
          visible ? "translate-y-0" : "translate-y-full",
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-lg font-bold text-white truncate pr-4">
            {song.title}
          </h3>
          <button
            type="button"
            onClick={closeMenu}
            className="p-1 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {/* 메뉴 아이템 */}
        <div className="px-3 pb-8">
          {song.spotify && (
            <a
              href={`https://open.spotify.com/track/${song.spotify.spotifyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              onClick={closeMenu}
            >
              <Image
                src={SpotifyIcon}
                alt="Spotify"
                width={28}
                height={28}
                className="shrink-0"
              />
              <span className="text-white text-base">Spotify에서 듣기</span>
            </a>
          )}

          {song.youtube && (
            <a
              href={`https://music.youtube.com/watch?v=${song.youtube.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              onClick={closeMenu}
            >
              <Image
                src={YoutubeMusicIcon}
                alt="YouTube Music"
                width={28}
                height={28}
                className="shrink-0"
              />
              <span className="text-white text-base">YouTube Music에서 듣기</span>
            </a>
          )}

          {(song.spotify || song.youtube) && (
            <div className="h-px bg-white/10 my-2" />
          )}

          {hasTjNumber ? (
            <button
              type="button"
              className="flex items-center gap-4 px-3 py-3 w-full rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => {
                // TODO: 정보수정 다이얼로그 열기
                closeMenu();
              }}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <Pencil className="size-5 text-gray-400" />
              </div>
              <span className="text-white text-base">정보 수정하기</span>
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-4 px-3 py-3 w-full rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => {
                // TODO: 노래 신청 다이얼로그 열기
                closeMenu();
              }}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <SendHorizonal className="size-5 text-gray-400" />
              </div>
              <span className="text-white text-base">노래 신청하기</span>
            </button>
          )}
        </div>

        {/* 하단 안전 영역 */}
        <div className="h-safe-area-inset-bottom bg-[#1a1a1a]" />
      </div>
    </>
  );
}
