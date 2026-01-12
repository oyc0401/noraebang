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

  const summaryItems = useMemo(() => {
    if (!detail) return [];
    const spotifyPopularity =
      typeof detail.spotify?.popularity === "number"
        ? String(detail.spotify.popularity)
        : "-";
    const spotifyFollowers =
      typeof detail.spotify?.followers === "number"
        ? detail.spotify.followers.toLocaleString()
        : "-";
    return [
      { label: "ID", value: `#${detail.id}` },
      { label: "분류", value: detail.catalog ?? "미분류" },
      { label: "곡 수", value: detail.songCount.toLocaleString() },
      {
        label: "Spotify 인기",
        value: spotifyPopularity,
      },
      {
        label: "Spotify 팔로워",
        value: spotifyFollowers,
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

    return (
      <>
        <div className="flex flex-col gap-4 border-b border-zinc-100 pb-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-zinc-100">
                {detail.thumbnails.high ? (
                  <img
                    src={detail.thumbnails.high}
                    alt={detail.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500">
                    {detail.name.at(0)}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-900">
                    {detail.name}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {detail.nameKo}
                    {detail.nameJa && (
                      <span className="ml-2 text-zinc-400">
                        {detail.nameJa}
                      </span>
                    )}
                    {detail.nameLatin && (
                      <span className="ml-2 text-zinc-400">
                        {detail.nameLatin}
                      </span>
                    )}
                  </p>
                </div>
                {detail.spotify?.url && (
                  <a
                    href={detail.spotify.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    Spotify 페이지 열기
                  </a>
                )}
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-3 rounded-2xl border border-zinc-100 bg-white/80 p-4 text-sm">
              {summaryItems.map((item) => (
                <div key={item.label} className="flex flex-col">
                  <dt className="text-xs uppercase tracking-wider text-zinc-400">
                    {item.label}
                  </dt>
                  <dd className="text-base font-semibold text-zinc-900">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {detail.spotify?.genres?.length ? (
            <div className="flex flex-wrap gap-2">
              {detail.spotify.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-hidden">
          <h3 className="py-4 text-lg font-semibold text-zinc-900">
            전체 곡 목록 ({detail.songs.length.toLocaleString()})
          </h3>
          <div className="flex h-[420px] flex-col gap-3 overflow-y-auto pr-2">
            {detail.songs.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                아직 등록된 곡이 없습니다.
              </div>
            )}
            {detail.songs.map((song) => (
              <div
                key={song.id}
                className="rounded-xl border border-zinc-100 bg-white/80 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                      <span>
                        유튜브: {song.hasYoutube ? "있음" : "없음"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs text-zinc-600">
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
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <section className="flex flex-col border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
      {renderBody()}
    </section>
  );
}
