"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistDetail } from "../action";
import type { ManagerArtistDetail } from "../types";
import { useManagerStore } from "../store";
import { ArtistAliasDialog } from "./artist-alias-dialog";
import { ArtistDetailProvider } from "./artist-detail-context";
import { ArtistDeleteDialog } from "./artist-delete-dialog";
import { ArtistMergeDialog } from "./artist-merge-dialog";
import { ArtistNameDialog } from "./artist-name-dialog";
import { ArtistSpotifyIdDialog } from "./artist-spotify-id-dialog";
import { ArtistYoutubeDialog } from "./artist-youtube-dialog";
import { SpotifyIcon } from "./spotify-icon";
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
            <button
              type="button"
              onClick={openArtistNameDialog}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-1 py-1 text-left transition hover:border-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  {detail.nameKo && <span>{detail.nameKo}</span>}
                  {detail.nameJaKanji && (
                    <span className="text-zinc-400">{detail.nameJaKanji}</span>
                  )}
                  {detail.nameJaKana && (
                    <span className="text-zinc-400">{detail.nameJaKana}</span>
                  )}
                  {detail.nameLatin && (
                    <span className="text-zinc-400">{detail.nameLatin}</span>
                  )}
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-600">
                    {detail.catalog ?? "미분류"}
                  </span>
                </div>
                {detail.slug && (
                  <div className="text-xs text-blue-500">@{detail.slug}</div>
                )}
              </div>
            </button>
            <div className="flex flex-1 flex-col items-end gap-2 text-xs">
              <div className="text-right">
                <p className="text-lg font-semibold text-zinc-900">
                  #{detail.id}
                </p>
              </div>
              <div className="flex gap-2">
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
                    편집
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
            {sortedSongs.map((song) => {
              const thumbnailSrc =
                song.thumbnails.default ??
                song.thumbnails.medium ??
                song.thumbnails.high ??
                null;
              const youtubeLink = song.youtubeVideoId
                ? `https://www.youtube.com/watch?v=${song.youtubeVideoId}`
                : null;
              const isGroupSelected =
                song.spotifyGroup?.id &&
                song.spotifyGroup.id === selectedGroupId;
              const primaryTrack = song.spotifyGroup?.primaryTrack;
              const primaryRelease = primaryTrack?.releaseDate ?? "-";
              const primaryDuration = formatDuration(primaryTrack?.durationMs);
              return (
                <div
                  key={song.id}
                  id={`song-card-${song.id}`}
                  onClick={() =>
                    setSelectedGroupId(song.spotifyGroup?.id ?? null)
                  }
                  className={`rounded-xl border px-4 py-3 transition ${
                    isGroupSelected
                      ? "border-blue-400 bg-blue-50"
                      : "border-zinc-100 bg-white/80"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt={song.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-400">
                          ♪
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex">
                            <p className="font-medium text-zinc-900">
                              {song.title}
                              {song.titleKo && (
                                <span className="ml-2 text-sm text-zinc-500 font-normal">
                                  {`(${song.titleKo})`}
                                </span>
                              )}
                              {song.titleLatin && (
                                <span className="ml-2 text-sm text-zinc-500 font-normal">
                                  {`(${song.titleLatin})`}
                                </span>
                              )}
                            </p>
                            {/* ✅ 곡 편집 버튼 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // 카드 선택 클릭 막기
                                setEditingSong(song);
                                setIsSongEditOpen(true);
                              }}
                              className=" rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                            >
                              편집
                            </button>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                              #{song.id}
                            </span>
                            <span>
                              분류: {song.catalog ? song.catalog : "미분류"}
                            </span>
                            {youtubeLink ? (
                              <a
                                href={youtubeLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2 py-0.5 text-[11px] text-red-700"
                              >
                                YouTube
                                <span className="text-[10px] text-red-500">
                                  {song.youtubeVideoId}
                                </span>
                              </a>
                            ) : (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                                유튜브 없음
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-600 pt-2">
                            {song.karaoke.length === 0 ? (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                                노래방 등록 없음
                              </span>
                            ) : (
                              song.karaoke.map((item) => (
                                <span
                                  key={`${song.id}-${item.provider}-${item.karaokeNo}`}
                                  className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700"
                                >
                                  {item.provider}: {item.karaokeNo}
                                </span>
                              ))
                            )}
                            {song.tjSong ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
                                <span className="text-[10px] text-emerald-600">
                                  TJ #{song.tjSong.id}
                                </span>
                                <span>
                                  {song.tjSong.title ?? "제목 없음"} ·{" "}
                                  {song.tjSong.artist ?? "아티스트 미상"}
                                </span>
                              </span>
                            ) : (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500">
                                TJ 정보 없음
                              </span>
                            )}
                          </div>
                        </div>
                        {song.spotifyGroup ? (
                          <div className="rounded-lg border border-emerald-100/70 bg-white/70 p-3 text-[11px] text-zinc-500 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                                <SpotifyIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-500">
                                  Group #{song.spotifyGroup.id}
                                </p>
                                {primaryTrack?.name ? (
                                  primaryTrack.spotifyUrl ? (
                                    <a
                                      href={primaryTrack.spotifyUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group block"
                                    >
                                      <span className="text-sm font-semibold text-zinc-900 group-hover:text-emerald-600">
                                        {primaryTrack?.name}
                                      </span>
                                      {primaryTrack.musicBrainzTitle && (
                                        <span className="block text-[11px] text-zinc-400 truncate">{`(${primaryTrack.musicBrainzTitle})`}</span>
                                      )}
                                    </a>
                                  ) : (
                                    <div>
                                      <p className="text-sm font-semibold text-zinc-900">
                                        {primaryTrack?.name}
                                      </p>
                                      <span className="block text-[11px] text-zinc-400 truncate">{`(${primaryTrack.musicBrainzTitle})`}</span>
                                    </div>
                                  )
                                ) : (
                                  <p className="font-semibold text-emerald-600">
                                    Primary track 없음
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                              <span className="inline-flex items-center rounded-full border border-emerald-100 px-2.5 py-0.5">
                                길이 {primaryDuration}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-emerald-100 px-2.5 py-0.5">
                                인기도 {primaryTrack?.popularity ?? "-"}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-emerald-100 px-2.5 py-0.5">
                                발매일 {primaryRelease}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

function formatDuration(durationMs?: number | null) {
  if (!durationMs || durationMs <= 0) return "-";
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [titleLatin, setTitleLatin] = useState("");
  const [catalog, setCatalog] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");

  useEffect(() => {
    if (!open || !song) return;
    setTitle(song.title ?? "");
    setTitleKo(song.titleKo ?? "");
    setTitleLatin(song.titleLatin ?? "");
    setCatalog(song.catalog ?? "");
    setYoutubeVideoId(song.youtubeVideoId ?? "");
  }, [open, song]);

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
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Title (KO)">
              <input
                value={titleKo}
                onChange={(e) => setTitleKo(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
              />
            </Field>

            <Field label="Title (Latin)">
              <input
                value={titleLatin}
                onChange={(e) => setTitleLatin(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
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
              />
            </Field>

            <Field label="YouTube Video ID">
              <input
                value={youtubeVideoId}
                onChange={(e) => setYoutubeVideoId(e.target.value)}
                placeholder="예: 6OC92oxs4gA"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              // TODO: 저장 로직 연결 (요청 주시면 action/mutation까지 붙여드리겠습니다)
              onOpenChange(false);
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            저장
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
