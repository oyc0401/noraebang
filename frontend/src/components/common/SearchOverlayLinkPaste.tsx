"use client";

import { useMutation } from "@tanstack/react-query";
import { Link } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { searchControllerSearchSongByMusicLink } from "@/api/model/search/search";
import { isMusicUrl } from "@/lib/music-url";

export function SearchOverlayLinkPaste() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const linkMutation = useMutation({
    mutationFn: async (url: string) => {
      const result = await searchControllerSearchSongByMusicLink({ url });
      return { songs: result.songs, url };
    },
    onSuccess: (data) => {
      const { url } = data;
      router.push(`/search?url=${encodeURIComponent(url)}`);
    },
  });

  const handlePaste = () => {
    if (navigator.clipboard?.readText) {
      navigator.clipboard
        .readText()
        .then((text) => {
          if (text.trim() && isMusicUrl(text)) {
            linkMutation.mutate(text);
          }
        })
        .catch(() => {
          if (inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.focus();
          }
        });
    } else {
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.focus();
      }
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text && isMusicUrl(text)) {
      e.preventDefault();
      linkMutation.mutate(text);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        onPaste={handleInputPaste}
        className="absolute opacity-0 pointer-events-none"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={handlePaste}
        disabled={linkMutation.isPending}
        className="w-full px-2 py-4 rounded-lg hover:bg-white/7 cursor-pointer transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Link className="size-5 text-primary" />
        <span className="text-white flex-1">
          {linkMutation.isPending ? "검색 중..." : "음악 링크 붙여넣기"}
        </span>
      </button>
    </>
  );
}
