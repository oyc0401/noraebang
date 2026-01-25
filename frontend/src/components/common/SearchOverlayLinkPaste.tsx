"use client";

import { useMutation } from "@tanstack/react-query";
import { Link } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { searchControllerSearchSongByYoutubeUrl } from "@/api/model/search/search";
import { isYoutubeUrl } from "@/lib/youtube";

export function SearchOverlayLinkPaste() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const youtubeMutation = useMutation({
    mutationFn: async (url: string) => {
      const result = await searchControllerSearchSongByYoutubeUrl({ url });
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
          if (text.trim() && isYoutubeUrl(text)) {
            youtubeMutation.mutate(text);
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
    if (text && isYoutubeUrl(text)) {
      e.preventDefault();
      youtubeMutation.mutate(text);
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
        disabled={youtubeMutation.isPending}
        className="w-full px-2 py-4 rounded-lg hover:bg-white/7 cursor-pointer transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Link className="size-5 text-primary" />
        <span className="text-white flex-1">
          {youtubeMutation.isPending ? "검색 중..." : "음악 링크 붙여넣기"}
        </span>
      </button>
    </>
  );
}
