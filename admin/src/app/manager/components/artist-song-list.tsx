"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchManagerArtistSongs,
  fetchManagerArtistInfo,
} from "../action";
import type { ManagerArtistSongDetail } from "../types";
import { useManagerStore } from "../store";
import { SongCard } from "./song-card";
import {
  SongDialogProvider,
  type SongDialogContextValue,
  type SongEditTab,
} from "./song-dialog-context";
import { SongEditDialog } from "./dialog/song-edit-dialog";
import { SongCreateDialog } from "./dialog/song-create-dialog";

type SongSortType = "popularity-desc" | "popularity-asc" | "tj-first";

export function ArtistSongList() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const selectedSongId = useManagerStore((state) => state.selectedSongId);
  const setSelectedSongId = useManagerStore(
    (state) => state.setSelectedSongId,
  );

  const [songs, setSongs] = useState<ManagerArtistSongDetail[]>([]);
  const [artistInfo, setArtistInfo] = useState<{
    name: string;
    nameKo: string;
    catalog?: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  // 정렬 상태
  const [sortType, setSortType] = useState<SongSortType>("popularity-desc");

  // 곡 편집 다이얼로그 상태
  const [isSongEditOpen, setIsSongEditOpen] = useState(false);
  const [editingSong, setEditingSong] =
    useState<ManagerArtistSongDetail | null>(null);
  const [editInitialTab, setEditInitialTab] = useState<SongEditTab>("info");

  const openSongEditDialog = useCallback(
    (
      songToEdit: ManagerArtistSongDetail,
      options?: { focusTab?: SongEditTab },
    ) => {
      setEditingSong(songToEdit);
      setEditInitialTab(options?.focusTab ?? "info");
      setIsSongEditOpen(true);
    },
    [],
  );

  const closeSongEditDialog = useCallback(() => {
    setIsSongEditOpen(false);
    setEditingSong(null);
  }, []);

  const handleSongCreated = useCallback((newSong: ManagerArtistSongDetail) => {
    setSongs((prev) => [newSong, ...prev]);
  }, []);

  const handleSongUpdated = useCallback(
    (updatedSong: ManagerArtistSongDetail) => {
      setSongs((prev) =>
        prev.map((song) => (song.id === updatedSong.id ? updatedSong : song)),
      );
    },
    [],
  );

  const handleSongDeleted = useCallback((songId: number) => {
    setSongs((prev) => prev.filter((song) => song.id !== songId));
  }, []);

  const openSongCreateDialog = useManagerStore(
    (state) => state.openSongCreateDialog,
  );

  const dialogContextValue = useMemo<SongDialogContextValue>(
    () => ({
      artistId: selectedArtistId ?? null,
      artistInfo,
      songEditState: {
        open: isSongEditOpen,
        song: editingSong,
        initialTab: editInitialTab,
      },
      openSongEditDialog,
      closeSongEditDialog,
      addSong: handleSongCreated,
      updateSong: handleSongUpdated,
      removeSong: handleSongDeleted,
    }),
    [
      artistInfo,
      closeSongEditDialog,
      editInitialTab,
      editingSong,
      handleSongCreated,
      handleSongDeleted,
      handleSongUpdated,
      isSongEditOpen,
      openSongEditDialog,
      selectedArtistId,
    ],
  );

  useEffect(() => {
    if (!selectedArtistId) {
      setSongs([]);
      setArtistInfo(null);
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
        const [songsResponse, infoResponse] = await Promise.all([
          fetchManagerArtistSongs(selectedArtistId),
          fetchManagerArtistInfo(selectedArtistId),
        ]);
        if (cancelled || fetchId !== fetchIdRef.current) {
          return;
        }
        setSongs(songsResponse?.songs ?? []);
        if (infoResponse) {
          setArtistInfo({
            name: infoResponse.name,
            nameKo: infoResponse.nameKo,
            catalog: infoResponse.catalog,
          });
        }
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

  // selectedSongId가 현재 곡 목록에 없으면 초기화
  useEffect(() => {
    if (
      selectedSongId &&
      !songs.some((song) => song.id === selectedSongId)
    ) {
      setSelectedSongId(null);
    }
  }, [songs, selectedSongId, setSelectedSongId]);

  const sortedSongs = useMemo(() => {
    // 각 곡의 primary track (가장 인기 높은 트랙) 구하는 함수
    const getPrimaryTrack = (song: ManagerArtistSongDetail) =>
      song.spotifyTracks
        ?.slice()
        .sort((a, b) => (b.popularity ?? -1) - (a.popularity ?? -1))[0];

    return [...songs].sort((a, b) => {
      // 스포티파이 연결 없으면 -1 (0보다 낮음)
      const primaryA = getPrimaryTrack(a);
      const primaryB = getPrimaryTrack(b);
      const popA = primaryA?.popularity ?? -1;
      const popB = primaryB?.popularity ?? -1;

      if (sortType === "popularity-desc") {
        // 스포티파이 인기순 (높은순)
        if (popA !== popB) return popB - popA;
        const releaseA = primaryA?.releaseDate ?? "";
        const releaseB = primaryB?.releaseDate ?? "";
        return releaseA.localeCompare(releaseB);
      }

      if (sortType === "popularity-asc") {
        // 스포티파이 인기순 (낮은순)
        if (popA !== popB) return popA - popB;
        const releaseA = primaryA?.releaseDate ?? "";
        const releaseB = primaryB?.releaseDate ?? "";
        return releaseA.localeCompare(releaseB);
      }

      // tj-first: TJ곡 유무 우선
      const tjA = a.karaoke.length > 0 ? 1 : 0;
      const tjB = b.karaoke.length > 0 ? 1 : 0;
      if (tjA !== tjB) return tjB - tjA;
      if (popA !== popB) return popB - popA;
      const releaseA = primaryA?.releaseDate ?? "";
      const releaseB = primaryB?.releaseDate ?? "";
      return releaseA.localeCompare(releaseB);
    });
  }, [songs, sortType]);

  // 선택된 곡으로 스크롤
  useEffect(() => {
    if (!songs.length || !selectedSongId) {
      return;
    }
    const targetSong = sortedSongs.find(
      (song) => song.id === selectedSongId,
    );
    if (targetSong) {
      const element = document.getElementById(`song-card-${targetSong.id}`);
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [sortedSongs, selectedSongId]);

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
    <SongDialogProvider value={dialogContextValue}>
      <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-zinc-900">
            전체 곡 목록 ({songs.length.toLocaleString()})
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SongSortType)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-zinc-700 cursor-pointer"
            >
              <option value="popularity-desc">스포티파이 인기순</option>
              <option value="popularity-asc">인기 낮은순</option>
              <option value="tj-first">TJ곡 우선</option>
            </select>
            <button
              type="button"
              onClick={() => openSongCreateDialog()}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition hover:bg-blue-100 cursor-pointer"
            >
              + 곡 추가
            </button>
          </div>
        </div>
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
              isSelected={
                Boolean(song.spotifyTracks?.length) &&
                song.id === selectedSongId
              }
              onSelect={setSelectedSongId}
              onEditClick={(s, options) =>
                openSongEditDialog(s, { focusTab: options?.focusTab })
              }
            />
          ))}
        </div>
      </div>

      <SongEditDialog />
      <SongCreateDialog />
    </SongDialogProvider>
  );
}

