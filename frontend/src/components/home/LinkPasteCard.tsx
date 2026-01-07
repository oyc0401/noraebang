"use client";

import Image from "next/image";
import { Link } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import YoutubeMusicIcon from "@/icons/youtube-music.svg";
import SpotifyIcon from "@/icons/spotify.svg";
import AppleMusicIcon from "@/icons/apple-music.svg";
import { isYoutubeUrl } from "@/lib/youtube";
import { searchControllerSearchSongByYoutubeUrl } from "@/api/model/search/search";
import { useSearchStore } from "@/store/searchStore";

export function LinkPasteCard() {
  const router = useRouter();
  const { setQuery, setSearchActive } = useSearchStore();

  const youtubeMutation = useMutation({
    mutationFn: async (url: string) => {
      return searchControllerSearchSongByYoutubeUrl({ url });
    },
    onSuccess: (data) => {
      // DB에서 곡을 찾은 경우
      if (data.song) {
        const song = data.song;
        const artistSlug = song.artists[0]?.slug;
        const songId = song.id;

        if (artistSlug) {
          router.push(`/channel/${artistSlug}#${songId}`);
        }
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

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-dark p-4 shadow-sm ring-1 ring-surface-border">
      <div className="relative z-10">
        <p className="text-sm font-medium text-surface-text leading-snug">
          <span className="text-white font-bold">음악 플랫폼 링크</span>
          를
          <br />
          붙여넣어 검색해보세요
        </p>
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
