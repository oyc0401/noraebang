"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistDetail } from "../action";
import type { ManagerArtistDetail } from "../types";
import { useManagerStore } from "../store";

export function CenterSection() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
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
      { label: "인기도", value: spotifyPopularity },
      { label: "팔로워", value: spotifyFollowers },
      { label: "장르", value: genres.length ? genres.slice(0, 4).join(", ") : "-" },
    ];
  }, [detail]);

  const youtubeStats = useMemo(() => {
    if (!detail) {
      return { total: 0, registered: 0, karaokeLinked: 0 };
    }
    const total = detail.songs.length;
    const registered = detail.songs.filter((song) => song.hasYoutube).length;
    const karaokeLinked = detail.songs.filter((song) => song.karaoke.length > 0).length;
    return { total, registered, karaokeLinked };
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

    return (
      <>
        <div className="space-y-3 border-b border-zinc-100 px-4 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                {detail.thumbnails.high ? (
                  <img
                    src={detail.thumbnails.high}
                    alt={detail.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-400">
                    {detail.name.at(0)}
                  </span>
                )}
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
                    <span className="ml-2 text-zinc-400">{detail.nameLatin}</span>
                  )}
                </div>
              </div>
            </div>
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
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40">
              <div className="flex items-center justify-between border-b border-emerald-100 px-4 py-2">
                <p className="text-xs font-semibold text-emerald-700">
                  Spotify 정보
                </p>
                {detail.spotify?.url && (
                  <a
                    href={detail.spotify.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-700 underline decoration-dotted"
                  >
                    페이지 열기
                  </a>
                )}
              </div>
              <dl className="divide-y divide-emerald-100 text-sm">
                {spotifyStats.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-2"
                  >
                    <dt className="text-xs uppercase tracking-wide text-emerald-500">
                      {item.label}
                    </dt>
                    <dd className="text-sm font-semibold text-emerald-900">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/40">
              <div className="flex items-center justify-between border-b border-red-100 px-4 py-2">
                <p className="text-xs font-semibold text-red-700">
                  YouTube / 노래방
                </p>
                <span className="text-[11px] text-red-600">
                  총 {youtubeStats.total}곡
                </span>
              </div>
              <dl className="divide-y divide-red-100 text-sm">
                <div className="flex items-center justify-between px-4 py-2">
                  <dt className="text-xs uppercase tracking-wide text-red-500">
                    유튜브 등록
                  </dt>
                  <dd className="text-sm font-semibold text-red-800">
                    {youtubeStats.registered.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-2">
                  <dt className="text-xs uppercase tracking-wide text-red-500">
                    노래방 연동
                  </dt>
                  <dd className="text-sm font-semibold text-red-800">
                    {youtubeStats.karaokeLinked.toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
          <h3 className="flex-shrink-0 px-4 py-4 text-lg font-semibold text-zinc-900">
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
                song.thumbnails.high ??
                song.thumbnails.medium ??
                song.thumbnails.default ??
                null;
              return (
                <div
                  key={song.id}
                  className="rounded-xl border border-zinc-100 bg-white/80 px-4 py-3"
                >
                  <div className="flex gap-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
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
                            <span>유튜브: {song.hasYoutube ? "있음" : "없음"}</span>
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
    <section className="flex h-full min-h-0 flex-col border border-zinc-200 bg-white pt-6 text-sm text-zinc-700">
      {renderBody()}
    </section>
  );
}
