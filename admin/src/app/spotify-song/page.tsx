"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MAX_ARTIST } from "@/lib/admin/z-param";

import {
  getSpotifySongIssues,
  type SpotifySongIssue,
} from "./actions";

const FILTER_OPTIONS = [
  { value: "spotify", label: "스포티파이 없음" },
  { value: "youtube", label: "유튜브 채널 없음" },
  { value: "both", label: "둘 다 없음" },
  { value: "all", label: "전체" },
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];

const STATUS_CLASS_MAP: Record<FilterValue, string> = {
  spotify: "bg-emerald-50 text-emerald-700 border-emerald-200",
  youtube: "bg-red-50 text-red-700 border-red-200",
  both: "bg-amber-50 text-amber-700 border-amber-200",
  all: "bg-zinc-50 text-zinc-700 border-zinc-200",
};

export default function SpotifySongIssuesPage() {
  const [songs, setSongs] = useState<SpotifySongIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("spotify");
  const [search, setSearch] = useState("");

  const loadSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getSpotifySongIssues();
      setSongs(list);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "곡 정보를 불러오지 못했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  const stats = useMemo(() => {
    let missingSpotify = 0;
    let missingYoutube = 0;
    let missingBoth = 0;
    songs.forEach((song) => {
      const lacksSpotify = !song.hasSpotify;
      const lacksYoutube = !song.hasYoutube;
      if (lacksSpotify) missingSpotify += 1;
      if (lacksYoutube) missingYoutube += 1;
      if (lacksSpotify && lacksYoutube) missingBoth += 1;
    });
    return {
      total: songs.length,
      missingSpotify,
      missingYoutube,
      missingBoth,
    };
  }, [songs]);

  const filteredSongs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return songs.filter((song) => {
      const lacksSpotify = !song.hasSpotify;
      const lacksYoutube = !song.hasYoutube;

      let matchesFilter = true;
      switch (filter) {
        case "spotify":
          matchesFilter = lacksSpotify;
          break;
        case "youtube":
          matchesFilter = lacksYoutube;
          break;
        case "both":
          matchesFilter = lacksSpotify && lacksYoutube;
          break;
        case "all":
        default:
          matchesFilter = lacksSpotify || lacksYoutube;
          break;
      }

      if (!matchesFilter) return false;
      if (!normalizedSearch) return true;

      const haystacks = [
        song.title ?? "",
        song.titleKo ?? "",
        song.tjSong?.id ?? "",
        song.tjSong?.title ?? "",
        song.tjSong?.artist ?? "",
        ...song.artists.map((artist) => artist.name),
        ...song.artists.map((artist) => artist.nameKo),
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return haystacks.some((value) => value.includes(normalizedSearch));
    });
  }, [songs, filter, search]);

  const statusCountMap: Record<FilterValue, number> = {
    spotify: stats.missingSpotify,
    youtube: stats.missingYoutube,
    both: stats.missingBoth,
    all: stats.total,
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-3 border-b border-zinc-200 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-600">
                TJ 매핑 완료 · Spotify/YouTube 누락
              </p>
              <h1 className="text-3xl font-bold text-zinc-900">
                Spotify 연결 누락 곡
              </h1>
              <p className="text-sm text-zinc-600">
                아티스트 ID ≤ {MAX_ARTIST} 범위 내에서 TJ곡은 연결되어 있으나
                Spotify 또는 YouTube 중 하나 이상 연결이 비어있는 곡들을
                모았습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={loadSongs}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
              disabled={loading}
            >
              {loading ? "갱신 중..." : "새로고침"}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500">전체 곡 수</p>
              <p className="text-2xl font-semibold text-zinc-900">
                {stats.total.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-xs text-emerald-700">스포티파이 미연결</p>
              <p className="text-2xl font-semibold text-emerald-900">
                {stats.missingSpotify.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
              <p className="text-xs text-red-700">유튜브 미연결</p>
              <p className="text-2xl font-semibold text-red-900">
                {stats.missingYoutube.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-xs text-amber-700">둘 다 미연결</p>
              <p className="text-2xl font-semibold text-amber-900">
                {stats.missingBoth.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const isActive = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      "cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold transition",
                      isActive
                        ? STATUS_CLASS_MAP[option.value]
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700",
                    ].join(" ")}
                    onClick={() => setFilter(option.value)}
                  >
                    {option.label}
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      {statusCountMap[option.value].toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-300 md:min-w-[260px]"
                placeholder="곡 제목, 아티스트, TJ ID 검색"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {error ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadSongs}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800 cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          ) : loading ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              곡 정보를 불러오는 중입니다...
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              조건에 해당하는 곡이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredSongs.map((song) => {
                const lacksSpotify = !song.hasSpotify;
                const lacksYoutube = !song.hasYoutube;
                return (
                  <div
                    key={song.id}
                    className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span className="font-semibold text-zinc-900">
                          #{song.id}
                        </span>
                        {song.tjSong?.id && (
                          <a
                            href={`https://www.tjmedia.com/tjsong/song_search_list.asp?strType=1&strText=${song.tjSong.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="cursor-pointer rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition hover:border-amber-300 hover:text-amber-900"
                          >
                            TJ {song.tjSong.id}
                          </a>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-zinc-900">
                          {song.title}
                        </p>
                        {song.titleKo && (
                          <p className="text-sm text-zinc-500">
                            {song.titleKo}
                          </p>
                        )}
                      </div>
                      {song.artists.length > 0 && (
                        <div className="text-sm text-zinc-600">
                          <span className="font-medium text-zinc-900">
                            아티스트
                          </span>
                          <span className="ml-2">
                            {song.artists
                              .map(
                                (artist) =>
                                  `${artist.nameKo} (${artist.name})`,
                              )
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      {song.tjSong?.title && (
                        <p className="text-xs text-zinc-500">
                          TJ 제목: {song.tjSong.title}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <div className="flex flex-wrap gap-2">
                        {lacksSpotify && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                            스포티파이 미연결
                          </span>
                        )}
                        {lacksYoutube && (
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                            유튜브 미연결
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Link
                          href={`/song#${song.id}`}
                          className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          곡 상세 열기
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
