"use client";

import { useEffect, useRef, useState } from "react";

import { fetchManagerArtistInfo } from "../action";
import type { ManagerArtistInfo } from "../types";
import { useManagerStore } from "../store";
import { ArtistAliasDialog } from "./dialog/artist-alias-dialog";
import { ArtistDetailProvider } from "./artist-detail-context";
import { ArtistDeleteDialog } from "./dialog/artist-delete-dialog";
import { ArtistMergeDialog } from "./dialog/artist-merge-dialog";
import { ArtistNameDialog } from "./dialog/artist-name-dialog";
import { ArtistSpotifyIdDialog } from "./dialog/artist-spotify-id-dialog";
import { ArtistYoutubeDialog } from "./dialog/artist-youtube-dialog";
import { ArtistSongList } from "./artist-song-list";
import { SpotifyInfoCard } from "./spotify-info-card";
import { YoutubeInfoCard } from "./youtube-info-card";

export function CenterSection() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const openArtistNameDialog = useManagerStore(
    (state) => state.openArtistNameDialog,
  );
  const openDeleteArtistDialog = useManagerStore(
    (state) => state.openDeleteArtistDialog,
  );
  const openMergeArtistDialog = useManagerStore(
    (state) => state.openMergeArtistDialog,
  );
  const openAliasDialog = useManagerStore((state) => state.openAliasDialog);
  const [detail, setDetail] = useState<ManagerArtistInfo | null>(null);
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
        const response = await fetchManagerArtistInfo(selectedArtistId);
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
                  {detail.nameJa && (
                    <span className="flex flex-col rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                      <span className="text-[10px] text-amber-400">nameJa</span>
                      <span className="text-amber-700">{detail.nameJa}</span>
                    </span>
                  )}

                  {detail.nameJaKana && (
                    <span className="flex flex-col rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                      <span className="text-[10px] text-amber-400">
                        nameJaKana
                      </span>
                      <span className="text-amber-700">
                        {detail.nameJaKana}
                      </span>
                    </span>
                  )}
                  {detail.nameLatin && (
                    <span className="flex flex-col rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1">
                      <span className="text-[10px] text-emerald-400">
                        nameLatin
                      </span>
                      <span className="text-emerald-700">
                        {detail.nameLatin}
                      </span>
                    </span>
                  )}
                  {detail.tjName && (
                    <span className="flex flex-col rounded-md border border-rose-200 bg-rose-50 px-2 py-1">
                      <span className="text-[10px] text-rose-400">tjName</span>
                      <span className="text-rose-700">{detail.tjName}</span>
                    </span>
                  )}
                  {detail.tjNameJa && (
                    <span className="flex flex-col rounded-md border border-rose-200 bg-rose-50 px-2 py-1">
                      <span className="text-[10px] text-rose-400">
                        tjNameJa
                      </span>
                      <span className="text-rose-700">{detail.tjNameJa}</span>
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

        {/* 곡 목록은 별도 컴포넌트로 분리 - store의 artistId를 보고 비동기로 불러옴 */}
        <ArtistSongList />
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
