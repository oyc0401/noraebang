"use client";

import { Copy, ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useSongProposeDialogStore } from "@/store/songProposeDialogStore";

export function SongProposeDialog() {
  const { isOpen, data, closeDialog } = useSongProposeDialogStore();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedField, setCopiedField] = useState<"title" | "artist" | null>(
    null,
  );

  useEffect(() => {
    if (isOpen && data) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
        setCopiedField(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, data]);

  const handleCopy = async (text: string, field: "title" | "artist") => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleGoToTj = () => {
    window.open("https://www.tjmedia.com/song/propose", "_blank");
  };

  if (!mounted || !data) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={closeDialog}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeDialog();
        }}
      />

      {/* 다이얼로그 */}
      <div
        className={cn(
          "fixed left-1/2 top-1/2 z-[70] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#1a1a1a] p-5 transition-all duration-300",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">TJ 노래 신청</h3>
          <button
            type="button"
            onClick={closeDialog}
            className="p-1 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="size-5 text-gray-400" />
          </button>
        </div>

        {/* 안내 문구 */}
        <p className="text-sm text-gray-400 mb-4">
          TJ 페이지로 이동 후, 아래 정보로 노래를 신청해주세요.
        </p>

        {/* 곡 제목 */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">곡 제목</label>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2.5">
            <span className="flex-1 text-white text-sm truncate">
              {data.songTitle}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(data.songTitle, "title")}
              className="shrink-0 p-1.5 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
            >
              <Copy className="size-4 text-gray-400" />
            </button>
            {copiedField === "title" && (
              <span className="text-xs text-green-400">복사됨</span>
            )}
          </div>
        </div>

        {/* 가수명 */}
        <div className="mb-5">
          <label className="text-xs text-gray-500 mb-1 block">가수명</label>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2.5">
            <span className="flex-1 text-white text-sm truncate">
              {data.artistName}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(data.artistName, "artist")}
              className="shrink-0 p-1.5 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
            >
              <Copy className="size-4 text-gray-400" />
            </button>
            {copiedField === "artist" && (
              <span className="text-xs text-green-400">복사됨</span>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={closeDialog}
            className="flex-1 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 cursor-pointer transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleGoToTj}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 cursor-pointer transition-colors"
          >
            <span>TJ 이동</span>
            <ExternalLink className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}
