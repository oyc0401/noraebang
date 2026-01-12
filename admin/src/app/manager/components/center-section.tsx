"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistDetail } from "../action";
import type { ManagerArtistDetail } from "../types";
import { useManagerStore } from "../store";
import { ArtistDetailProvider } from "./artist-detail-context";
import { ArtistDeleteDialog } from "./artist-delete-dialog";
import { ArtistMergeDialog } from "./artist-merge-dialog";
import { ArtistNameDialog } from "./artist-name-dialog";
import { ArtistSpotifyIdDialog } from "./artist-spotify-id-dialog";
import { ArtistYoutubeDialog } from "./artist-youtube-dialog";
import { SpotifyInfoCard } from "./spotify-info-card";
import { YoutubeInfoCard } from "./youtube-info-card";

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
                  {detail.nameJa && (
                    <span className="text-zinc-400">{detail.nameJa}</span>
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
                          <p className="font-medium text-zinc-900">
                            {song.title}
                            {song.titleKo && (
                              <span className="ml-2 text-sm text-zinc-500 font-normal">
                                {`(${song.titleKo})`}
                              </span>
                            )}
                          </p>
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
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
                                <span>TJ {song.tjSong.id}</span>
                                {"  "}
                                <span>{song.tjSong.title ?? "제목 없음"}</span>
                                {"  "}
                                <span>
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
                          <div className="text-right text-[11px] text-zinc-500 space-y-1">
                            {primaryTrack?.name ? (
                              <p className="text-sm font-semibold text-black">
                                {primaryTrack?.name}
                                <span className="text-gray-400 text-xs">{` (${primaryTrack.musicBrainzTitle})`}</span>
                              </p>
                            ) : (
                              <p className="font-semibold text-blue-600">
                                {"Primary track 없음"}
                              </p>
                            )}

                            <p className="text-xs">
                              그룹 #{song.spotifyGroup.id}
                            </p>
                            <div className="space-y-0.5">
                              <p>
                                <span>길이 {primaryDuration} </span> / 인기도{" "}
                                {primaryTrack?.popularity ?? "-"}{" "}
                              </p>

                              <p>발매일 {primaryRelease}</p>
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
