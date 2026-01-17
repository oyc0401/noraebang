"use client";

import { useEffect, useState } from "react";

import type { ManagerArtistDetail, SongLinkedArtist } from "../types";
import {
  linkSongArtist,
  searchArtistsForLink,
  unlinkSongArtist,
} from "../action";

type SongItem = ManagerArtistDetail["songs"][number];

type SongArtistDialogProps = {
  open: boolean;
  song: SongItem | null;
  onOpenChange: (open: boolean) => void;
  onArtistsChange?: (artists: SongLinkedArtist[]) => void;
};

export function SongArtistDialog({
  open,
  song,
  onOpenChange,
  onArtistsChange,
}: SongArtistDialogProps) {
  const [linkedArtists, setLinkedArtists] = useState<SongLinkedArtist[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: number; name: string; nameKo: string }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    "MAIN" | "FEATURING" | "PRODUCER" | null
  >(null);

  // 다이얼로그 열릴 때 초기화
  useEffect(() => {
    if (open && song) {
      setLinkedArtists(song.artists);
      setSearchTerm("");
      setSearchResults([]);
      setError(null);
      setSelectedRole(null);
    }
  }, [open, song]);

  // 검색어 변경 시 검색 실행 (디바운스)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchArtistsForLink(searchTerm);
        // 이미 연결된 아티스트는 제외
        const linkedIds = new Set(linkedArtists.map((a) => a.id));
        setSearchResults(results.filter((r) => !linkedIds.has(r.id)));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, linkedArtists]);

  async function handleLinkArtist(artistId: number) {
    if (!song) return;

    setError(null);
    try {
      const updatedArtists = await linkSongArtist({
        songId: song.id,
        artistId,
        role: selectedRole,
      });
      setLinkedArtists(updatedArtists);
      onArtistsChange?.(updatedArtists);
      setSearchTerm("");
      setSearchResults([]);
      setSelectedRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "연결에 실패했습니다.");
    }
  }

  async function handleUnlinkArtist(artistId: number, artistName: string) {
    if (!song) return;

    const confirmed = window.confirm(
      `"${artistName}" 아티스트 연결을 삭제하시겠습니까?`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      const updatedArtists = await unlinkSongArtist({
        songId: song.id,
        artistId,
      });
      setLinkedArtists(updatedArtists);
      onArtistsChange?.(updatedArtists);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative z-10 w-[560px] max-w-[calc(100vw-32px)] max-h-[80vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 flex-shrink-0">
          <div>
            <h4 className="text-base font-semibold text-zinc-900">
              아티스트 관리
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              #{song?.id ?? "-"} · {song?.title ?? "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:border-zinc-300 cursor-pointer"
          >
            닫기
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* 연결된 아티스트 목록 */}
          <div>
            <h5 className="text-sm font-medium text-zinc-700 mb-2">
              연결된 아티스트 ({linkedArtists.length})
            </h5>
            {linkedArtists.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500">
                연결된 아티스트가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedArtists.map((artist) => (
                  <div
                    key={artist.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">
                        #{artist.id}
                      </span>
                      <span className="font-medium text-zinc-900">
                        {artist.name}
                      </span>
                      <span className="text-sm text-zinc-500">
                        ({artist.nameKo})
                      </span>
                      {artist.role && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] text-purple-700">
                          {getRoleLabel(artist.role)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleUnlinkArtist(artist.id, artist.nameKo || artist.name)
                      }
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 cursor-pointer"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 아티스트 검색 및 추가 */}
          <div className="border-t border-zinc-100 pt-4">
            <h5 className="text-sm font-medium text-zinc-700 mb-2">
              아티스트 추가
            </h5>

            {/* 역할 선택 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-zinc-500">역할:</span>
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className={`rounded-full px-2 py-0.5 text-xs transition cursor-pointer ${
                  selectedRole === null
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                없음
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("MAIN")}
                className={`rounded-full px-2 py-0.5 text-xs transition cursor-pointer ${
                  selectedRole === "MAIN"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                메인
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("FEATURING")}
                className={`rounded-full px-2 py-0.5 text-xs transition cursor-pointer ${
                  selectedRole === "FEATURING"
                    ? "bg-amber-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                피처링
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("PRODUCER")}
                className={`rounded-full px-2 py-0.5 text-xs transition cursor-pointer ${
                  selectedRole === "PRODUCER"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                프로듀서
              </button>
            </div>

            {/* 검색창 */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="아티스트 이름 또는 ID로 검색..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
              {isSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                  검색중...
                </span>
              )}
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white">
                {searchResults.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => handleLinkArtist(artist.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-zinc-50 cursor-pointer"
                  >
                    <span className="text-xs text-zinc-400">#{artist.id}</span>
                    <span className="font-medium text-zinc-900">
                      {artist.name}
                    </span>
                    <span className="text-sm text-zinc-500">
                      ({artist.nameKo})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchTerm.trim() && !isSearching && searchResults.length === 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                검색 결과가 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "MAIN":
      return "메인";
    case "FEATURING":
      return "피처링";
    case "PRODUCER":
      return "프로듀서";
    default:
      return role;
  }
}
