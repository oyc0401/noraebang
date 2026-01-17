"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistSongs, updateSong } from "../action";
import type { ManagerArtistSongDetail } from "../types";
import { useManagerStore } from "../store";
import { SongCard } from "./song-card";

export function ArtistSongList() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const selectedGroupId = useManagerStore((state) => state.selectedGroupId);
  const setSelectedGroupId = useManagerStore(
    (state) => state.setSelectedGroupId,
  );

  const [songs, setSongs] = useState<ManagerArtistSongDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  // 곡 편집 다이얼로그 상태
  const [isSongEditOpen, setIsSongEditOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<ManagerArtistSongDetail | null>(null);

  useEffect(() => {
    if (!selectedArtistId) {
      setSongs([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setSongs([]);

    const fetchId = fetchIdRef.current + 1;
    fetchIdRef.current = fetchId;

    async function run() {
      if (!selectedArtistId) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchManagerArtistSongs(selectedArtistId);
        if (cancelled || fetchId !== fetchIdRef.current) {
          return;
        }
        setSongs(response?.songs ?? []);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMessage("곡 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedArtistId]);

  // selectedGroupId가 현재 곡 목록에 없으면 초기화
  useEffect(() => {
    if (
      selectedGroupId &&
      !songs.some((song) => song.spotifyGroup?.id === selectedGroupId)
    ) {
      setSelectedGroupId(null);
    }
  }, [songs, selectedGroupId, setSelectedGroupId]);

  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      const tjA = a.karaoke.length > 0 ? 1 : 0;
      const tjB = b.karaoke.length > 0 ? 1 : 0;
      if (tjA !== tjB) {
        return tjB - tjA;
      }
      const popA = a.spotifyGroup?.primaryTrack?.popularity ?? -1;
      const popB = b.spotifyGroup?.primaryTrack?.popularity ?? -1;
      if (popA !== popB) {
        return popB - popA;
      }
      const releaseA = a.spotifyGroup?.primaryTrack?.releaseDate ?? "";
      const releaseB = b.spotifyGroup?.primaryTrack?.releaseDate ?? "";
      return releaseA.localeCompare(releaseB);
    });
  }, [songs]);

  // 선택된 그룹으로 스크롤
  useEffect(() => {
    if (!songs.length || !selectedGroupId) {
      return;
    }
    const targetSong = sortedSongs.find(
      (song) => song.spotifyGroup?.id === selectedGroupId,
    );
    if (targetSong) {
      const element = document.getElementById(`song-card-${targetSong.id}`);
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [sortedSongs, selectedGroupId]);

  if (!selectedArtistId) {
    return null;
  }

  if (isLoading && songs.length === 0) {
    return (
      <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
        <h3 className="flex-shrink-0 px-4 py-4 text-lg font-semibold text-zinc-900 border-b border-gray-200">
          전체 곡 목록
        </h3>
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          곡 목록을 불러오는 중...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
        <h3 className="flex-shrink-0 px-4 py-4 text-lg font-semibold text-zinc-900 border-b border-gray-200">
          전체 곡 목록
        </h3>
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
        <h3 className="flex-shrink-0 px-4 py-4 text-lg font-semibold text-zinc-900 border-b border-gray-200">
          전체 곡 목록 ({songs.length.toLocaleString()})
        </h3>
        <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto pr-2">
          {sortedSongs.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
              아직 등록된 곡이 없습니다.
            </div>
          )}
          {sortedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isGroupSelected={
                Boolean(song.spotifyGroup?.id) &&
                song.spotifyGroup?.id === selectedGroupId
              }
              onSelectGroup={setSelectedGroupId}
              onEditClick={(s) => {
                setEditingSong(s);
                setIsSongEditOpen(true);
              }}
              onArtistsChange={(songId, artists) => {
                setSongs((prev) =>
                  prev.map((s) => (s.id === songId ? { ...s, artists } : s)),
                );
              }}
            />
          ))}
        </div>
      </div>

      {/* 곡 편집 다이얼로그 */}
      <SongEditDialog
        open={isSongEditOpen}
        song={editingSong}
        onOpenChange={(open) => {
          setIsSongEditOpen(open);
          if (!open) setEditingSong(null);
        }}
        onSongUpdated={(updatedSong) => {
          setSongs((prev) =>
            prev.map((s) => (s.id === updatedSong.id ? updatedSong : s)),
          );
        }}
      />
    </>
  );
}

function SongEditDialog({
  open,
  song,
  onOpenChange,
  onSongUpdated,
}: {
  open: boolean;
  song: ManagerArtistSongDetail | null;
  onOpenChange: (open: boolean) => void;
  onSongUpdated: (song: ManagerArtistSongDetail) => void;
}) {
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [titleLatin, setTitleLatin] = useState("");
  const [catalog, setCatalog] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !song) return;
    setTitle(song.title ?? "");
    setTitleKo(song.titleKo ?? "");
    setTitleLatin(song.titleLatin ?? "");
    setCatalog(song.catalog ?? "");
    setYoutubeVideoId(song.youtubeVideoId ?? "");
    setError(null);
    setIsSaving(false);
  }, [open, song]);

  async function handleSave() {
    if (!song) return;

    setIsSaving(true);
    setError(null);
    try {
      const updatedSong = await updateSong({
        songId: song.id,
        title,
        titleKo,
        titleLatin,
        catalog,
        youtubeVideoId,
      });

      onSongUpdated(updatedSong as ManagerArtistSongDetail);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
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
        className="relative z-10 w-[560px] max-w-[calc(100vw-32px)] rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h4 className="text-base font-semibold text-zinc-900">곡 편집</h4>
            <p className="mt-1 text-xs text-zinc-500">
              #{song?.id ?? "-"} · 필요한 필드만 수정하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:border-zinc-300"
          >
            닫기
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
              disabled={isSaving}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Title (KO)">
              <input
                value={titleKo}
                onChange={(e) => setTitleKo(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                disabled={isSaving}
              />
            </Field>

            <Field label="Title (Latin)">
              <input
                value={titleLatin}
                onChange={(e) => setTitleLatin(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                disabled={isSaving}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Catalog">
              <input
                value={catalog}
                onChange={(e) => setCatalog(e.target.value)}
                placeholder='예: "KPOP" | "JPOP" ...'
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                disabled={isSaving}
              />
            </Field>

            <Field label="YouTube Video ID">
              <input
                value={youtubeVideoId}
                onChange={(e) => setYoutubeVideoId(e.target.value)}
                placeholder="예: 6OC92oxs4gA"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                disabled={isSaving}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-300"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-600">{label}</div>
      {children}
    </label>
  );
}
