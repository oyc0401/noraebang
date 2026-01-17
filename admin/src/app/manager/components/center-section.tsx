"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useArtistDetailContext } from "./artist-detail-context";
import { fetchManagerArtistDetail, updateSong } from "../action";
import type { ManagerArtistDetail } from "../types";
import { useManagerStore } from "../store";
import { ArtistAliasDialog } from "./artist-alias-dialog";
import { ArtistDetailProvider } from "./artist-detail-context";
import { ArtistDeleteDialog } from "./artist-delete-dialog";
import { ArtistMergeDialog } from "./artist-merge-dialog";
import { ArtistNameDialog } from "./artist-name-dialog";
import { ArtistSpotifyIdDialog } from "./artist-spotify-id-dialog";
import { ArtistYoutubeDialog } from "./artist-youtube-dialog";
import { SongCard } from "./song-card";
import { SpotifyInfoCard } from "./spotify-info-card";
import { YoutubeInfoCard } from "./youtube-info-card";

type SongItem = ManagerArtistDetail["songs"][number];

export function CenterSection() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const openArtistNameDialog = useManagerStore(
    (state) => state.openArtistNameDialog,
  );
  const selectedGroupId = useManagerStore((state) => state.selectedGroupId);
  const setSelectedGroupId = useManagerStore(
    (state) => state.setSelectedGroupId,
  );
  const openDeleteArtistDialog = useManagerStore(
    (state) => state.openDeleteArtistDialog,
  );
  const openMergeArtistDialog = useManagerStore(
    (state) => state.openMergeArtistDialog,
  );
  const openAliasDialog = useManagerStore((state) => state.openAliasDialog);
  const [detail, setDetail] = useState<ManagerArtistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  useEffect(() => {
    if (!selectedArtistId) {
      setDetail(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setDetail(null);

    const fetchId = fetchIdRef.current + 1;
    fetchIdRef.current = fetchId;

    async function run() {
      if (!selectedArtistId) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchManagerArtistDetail(selectedArtistId);
        if (cancelled || fetchId !== fetchIdRef.current) {
          return;
        }
        setDetail(response);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMessage("아티스트 정보를 불러오지 못했습니다.");
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

  // ✅ 곡 편집 다이얼로그 상태
  const [isSongEditOpen, setIsSongEditOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongItem | null>(null);

  useEffect(() => {
    if (!isActionMenuOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setIsActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isActionMenuOpen]);

  useEffect(() => {
    setIsActionMenuOpen(false);
  }, [detail?.id]);

  useEffect(() => {
    if (
      selectedGroupId &&
      !detail?.songs.some((song) => song.spotifyGroup?.id === selectedGroupId)
    ) {
      setSelectedGroupId(null);
    }
  }, [detail?.songs, selectedGroupId, setSelectedGroupId]);

  const sortedSongs = useMemo(() => {
    if (!detail) return [];
    return [...detail.songs].sort((a, b) => {
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
  }, [detail]);

  useEffect(() => {
    if (!detail?.songs.length || !selectedGroupId) {
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

  const renderBody = () => {
    if (!selectedArtistId) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-500">
          <p>왼쪽에서 아티스트를 선택하면 상세 정보가 여기에 표시됩니다.</p>
        </div>
      );
    }

    if (isLoading && !detail) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-500">
          <p>선택된 아티스트 정보를 불러오는 중...</p>
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      );
    }

    if (!detail) {
      return null;
    }

    const youtubeChannels = detail.youtubeChannels ?? [];

    return (
      <>
        <div className="space-y-3 border-b border-zinc-100 px-4 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                {(() => {
                  const artistThumb =
                    detail.thumbnails.default ??
                    detail.thumbnails.medium ??
                    detail.thumbnails.high ??
                    null;
                  if (!artistThumb) {
                    return (
                      <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-400">
                        {detail.name.at(0)}
                      </span>
                    );
                  }
                  return (
                    <img
                      src={artistThumb}
                      alt={detail.name}
                      className="h-full w-full object-cover"
                    />
                  );
                })()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {detail.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {detail.nameKo && (
                    <span className="flex flex-col rounded-md border border-blue-200 bg-blue-50 px-2 py-1">
                      <span className="text-[10px] text-blue-400">nameKo</span>
                      <span className="text-blue-700">{detail.nameKo}</span>
                    </span>
                  )}
                  {detail.nameJaKanji && (
                    <span className="flex flex-col rounded-md border border-rose-200 bg-rose-50 px-2 py-1">
                      <span className="text-[10px] text-rose-400">nameJaKanji</span>
                      <span className="text-rose-700">{detail.nameJaKanji}</span>
                    </span>
                  )}
                  {detail.nameJaKana && (
                    <span className="flex flex-col rounded-md border border-rose-200 bg-rose-50 px-2 py-1">
                      <span className="text-[10px] text-rose-400">nameJaKana</span>
                      <span className="text-rose-700">{detail.nameJaKana}</span>
                    </span>
                  )}
                  {detail.nameLatin && (
                    <span className="flex flex-col rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1">
                      <span className="text-[10px] text-emerald-400">nameLatin</span>
                      <span className="text-emerald-700">{detail.nameLatin}</span>
                    </span>
                  )}
                  {detail.tjName && (
                    <span className="flex flex-col rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                      <span className="text-[10px] text-amber-400">tjName</span>
                      <span className="text-amber-700">{detail.tjName}</span>
                    </span>
                  )}
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600">
                    {detail.catalog ?? "미분류"}
                  </span>
                </div>
                {detail.slug && (
                  <div className="text-xs text-blue-500">@{detail.slug}</div>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col items-end gap-2 text-xs">
              <div className="text-right">
                <p className="text-lg font-semibold text-zinc-900">
                  #{detail.id}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openArtistNameDialog}
                  className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1 text-zinc-600 transition hover:border-blue-200 hover:text-blue-600"
                >
                  편집
                </button>
                <button
                  type="button"
                  onClick={openAliasDialog}
                  className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1 text-zinc-600 transition hover:border-blue-200 hover:text-blue-600"
                >
                  별칭 보기
                </button>
                <div className="relative" ref={actionMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsActionMenuOpen((previous) => !previous)}
                    className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1 text-zinc-600 transition hover:border-blue-200 hover:text-blue-600"
                  >
                    삭제
                  </button>
                  {isActionMenuOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          openMergeArtistDialog();
                        }}
                        className="flex w-full items-center px-3 py-2 text-left text-amber-600 transition hover:bg-amber-50"
                      >
                        아티스트 병합
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          openDeleteArtistDialog();
                        }}
                        className="flex w-full items-center px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
                      >
                        아티스트 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <SpotifyInfoCard detail={detail} />
            <YoutubeInfoCard detail={detail} />
          </div>
        </div>

        <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
          <h3 className="flex-shrink-0 px-4 py-4 text-lg font-semibold text-zinc-900 border-b border-gray-200">
            전체 곡 목록 ({detail.songs.length.toLocaleString()})
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
                  if (detail && setDetail) {
                    const newSongs = detail.songs.map((s) =>
                      s.id === songId ? { ...s, artists } : s,
                    );
                    setDetail({ ...detail, songs: newSongs });
                  }
                }}
              />
            ))}
          </div>
        </div>
        {/* ✅ 곡 편집 다이얼로그 */}
        <SongEditDialog
          open={isSongEditOpen}
          song={editingSong}
          onOpenChange={(open) => {
            setIsSongEditOpen(open);
            if (!open) setEditingSong(null);
          }}
        />
      </>
    );
  };

  return (
    <ArtistDetailProvider detail={detail} setDetail={setDetail}>
      <section className="flex h-full min-h-0 flex-col border border-zinc-200 bg-white pt-6 text-sm text-zinc-700">
        {renderBody()}
      </section>
      <ArtistNameDialog />
      <ArtistSpotifyIdDialog />
      <ArtistDeleteDialog />
      <ArtistMergeDialog />
      <ArtistYoutubeDialog />
      <ArtistAliasDialog />
    </ArtistDetailProvider>
  );
}

function SongEditDialog({
  open,
  song,
  onOpenChange,
}: {
  open: boolean;
  song: SongItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { detail, setDetail } = useArtistDetailContext();
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

      if (detail && setDetail) {
        const newSongs = detail.songs.map((s) =>
          s.id === updatedSong.id ? updatedSong : s,
        );
        setDetail({ ...detail, songs: newSongs });
      }

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
