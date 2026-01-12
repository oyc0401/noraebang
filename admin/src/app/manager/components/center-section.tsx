"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistDetail } from "../action";
import type { ManagerArtistDetail } from "../types";
import { useManagerStore } from "../store";
import { ArtistDetailProvider } from "./artist-detail-context";
import { ArtistNameDialog } from "./artist-name-dialog";

export function CenterSection() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const openArtistNameDialog = useManagerStore(
    (state) => state.openArtistNameDialog,
  );
  const [detail, setDetail] = useState<ManagerArtistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

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

  const generalSummaryItems = useMemo(() => {
    if (!detail) return [];
    return [
      { label: "ID", value: `#${detail.id}` },
      { label: "분류", value: detail.catalog ?? "미분류" },
    ];
  }, [detail]);

  const spotifyStats = useMemo(() => {
    if (!detail) return [];
    const spotifyId = detail.spotifyId ?? "-";
    const spotifyPopularity =
      typeof detail.spotify?.popularity === "number"
        ? String(detail.spotify.popularity)
        : "-";
    const spotifyFollowers =
      typeof detail.spotify?.followers === "number"
        ? detail.spotify.followers.toLocaleString()
        : "-";
    const genres = detail.spotify?.genres ?? [];
    return [
      { label: "ID", value: spotifyId || "-" },
      { label: "인기도", value: spotifyPopularity },
      { label: "팔로워", value: spotifyFollowers },
      {
        label: "장르",
        value: genres.length ? genres.slice(0, 3).join(", ") : "-",
        wide: true,
      },
    ];
  }, [detail]);

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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                <div className="text-xs text-zinc-500">
                  <span>{detail.nameKo}</span>
                  {detail.nameJa && (
                    <span className="ml-2 text-zinc-400">{detail.nameJa}</span>
                  )}
                  {detail.nameLatin && (
                    <span className="ml-2 text-zinc-400">
                      {detail.nameLatin}
                    </span>
                  )}
                </div>
              </div>
            </button>
            <div className="grid w-full max-w-md grid-cols-2 gap-2 text-xs">
              {generalSummaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] text-zinc-600">
              <div className="flex items-center justify-between text-emerald-700">
                <p className="font-semibold">Spotify</p>
                {detail.spotify?.url ? (
                  <a
                    href={detail.spotify.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] underline"
                  >
                    열기
                  </a>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {spotifyStats.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-1 ${
                      item.wide ? "basis-full" : ""
                    }`}
                  >
                    <span className="text-zinc-400">{item.label}:</span>
                    <span className="font-semibold text-zinc-800 break-all">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/40">
              <div className="flex items-center justify-between border-b border-red-100 px-4 py-2">
                <p className="text-xs font-semibold text-red-700">
                  YouTube 채널
                </p>
                <span className="text-[11px] text-red-600">
                  {youtubeChannels.length
                    ? `${youtubeChannels.length}개`
                    : "등록된 채널 없음"}
                </span>
              </div>
              {youtubeChannels.length === 0 ? (
                <div className="px-4 py-3 text-xs text-red-500">
                  연결된 유튜브 채널이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-red-100">
                  {youtubeChannels.map((channel) => {
                    const thumb =
                      channel.thumbnails.default ??
                      channel.thumbnails.medium ??
                      channel.thumbnails.high ??
                      null;
                    const channelUrl = `https://www.youtube.com/channel/${channel.channelId}`;
                    return (
                      <a
                        key={channel.id}
                        href={channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-red-50/70"
                      >
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-red-100">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={channel.title ?? channel.channelId}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-red-500">
                              YT
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-900">
                            {channel.title ?? "채널 이름 없음"}
                          </p>
                          <p className="text-[11px] text-red-500">
                            {channel.type} · {channel.channelId}
                          </p>
                        </div>
                        {channel.subscriberCount ? (
                          <span className="text-xs font-semibold text-red-700">
                            {channel.subscriberCount.toLocaleString()}명
                          </span>
                        ) : (
                          <span className="text-[11px] text-red-400">
                            구독자 정보 없음
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
          <h3 className="flex-shrink-0 px-4 py-4 text-lg font-semibold text-zinc-900 border-b border-gray-200">
            전체 곡 목록 ({detail.songs.length.toLocaleString()})
          </h3>
          <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto pr-2">
            {detail.songs.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                아직 등록된 곡이 없습니다.
              </div>
            )}
            {detail.songs.map((song) => {
              const thumbnailSrc =
                song.thumbnails.default ??
                song.thumbnails.medium ??
                song.thumbnails.high ??
                null;
              const youtubeLink = song.youtubeVideoId
                ? `https://www.youtube.com/watch?v=${song.youtubeVideoId}`
                : null;
              return (
                <div
                  key={song.id}
                  className="rounded-xl border border-zinc-100 bg-white/80 px-4 py-3"
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
                              <span className="ml-2 text-sm text-zinc-500">
                                {song.titleKo}
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
                        </div>
                        <div className="flex flex-wrap gap-1 text-[11px] text-zinc-600">
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
                        </div>
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
    </ArtistDetailProvider>
  );
}
