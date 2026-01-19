"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MAX_ARTIST } from "@/lib/admin/z-param";

import {
  getSpotifySongIssues,
  getUnlinkedYoutubeVideos,
  getUnlinkedSpotifyTracks,
  type SpotifySongIssue,
  type UnlinkedYoutubeVideo,
  type UnlinkedSpotifyTrack,
} from "./actions";
import { extractArtistJson, applyYoutubeMappingFromJson } from "./extract-artist-json";

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

type TabType = "songs" | "youtube" | "spotify";

export default function SpotifySongIssuesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("songs");

  const [songs, setSongs] = useState<SpotifySongIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("spotify");
  const [search, setSearch] = useState("");

  const [unlinkedYoutubeVideos, setUnlinkedYoutubeVideos] = useState<UnlinkedYoutubeVideo[]>([]);
  const [unlinkedSpotifyTracks, setUnlinkedSpotifyTracks] = useState<UnlinkedSpotifyTrack[]>([]);
  const [loadingYoutube, setLoadingYoutube] = useState(false);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [youtubeLoaded, setYoutubeLoaded] = useState(false);
  const [spotifyLoaded, setSpotifyLoaded] = useState(false);

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

  const loadUnlinkedYoutubeVideos = useCallback(async () => {
    setLoadingYoutube(true);
    try {
      const list = await getUnlinkedYoutubeVideos();
      setUnlinkedYoutubeVideos(list);
      setYoutubeLoaded(true);
    } catch (err) {
      console.error("미연결 유튜브 영상 로드 실패:", err);
    } finally {
      setLoadingYoutube(false);
    }
  }, []);

  const loadUnlinkedSpotifyTracks = useCallback(async () => {
    setLoadingSpotify(true);
    try {
      const list = await getUnlinkedSpotifyTracks();
      setUnlinkedSpotifyTracks(list);
      setSpotifyLoaded(true);
    } catch (err) {
      console.error("미연결 스포티파이 트랙 로드 실패:", err);
    } finally {
      setLoadingSpotify(false);
    }
  }, []);

  // 탭 전환 시 해당 데이터 로드
  useEffect(() => {
    if (activeTab === "youtube" && !youtubeLoaded && !loadingYoutube) {
      loadUnlinkedYoutubeVideos();
    }
    if (activeTab === "spotify" && !spotifyLoaded && !loadingSpotify) {
      loadUnlinkedSpotifyTracks();
    }
  }, [activeTab, youtubeLoaded, spotifyLoaded, loadingYoutube, loadingSpotify, loadUnlinkedYoutubeVideos, loadUnlinkedSpotifyTracks]);

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

  const handleCopyYoutubeMissingJson = useCallback(async () => {
    const targetSongs = filteredSongs.filter((song) => !song.hasYoutube);
    if (targetSongs.length === 0) {
      alert("유튜브 채널이 없는 곡이 없습니다.");
      return;
    }

    const artistMap = new Map<
      number,
      {
        artistId: number;
        artistname: string;
        songs: Array<{ songId: number; title: string }>;
      }
    >();

    targetSongs.forEach((song) => {
      song.artists.forEach((artist) => {
        if (!artistMap.has(artist.id)) {
          artistMap.set(artist.id, {
            artistId: artist.id,
            artistname: artist.name,
            songs: [],
          });
        }
        artistMap.get(artist.id)!.songs.push({
          songId: song.id,
          title: song.title,
        });
      });
    });

    const payload = Array.from(artistMap.values())
      .map((artist) => ({
        ...artist,
        songs: artist.songs.sort((a, b) => a.songId - b.songId),
      }))
      .sort((a, b) => a.artistId - b.artistId);

    const jsonString = JSON.stringify(payload, null, 2);
    await navigator.clipboard.writeText(jsonString);
    alert(`유튜브 채널 없는 곡 ${targetSongs.length}개 목록을 복사했습니다.`);
  }, [filteredSongs]);

  return (
    <div className="min-h-screen bg-zinc-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-3 border-b border-zinc-200 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-600">
                연결 현황 관리
              </p>
              <h1 className="text-3xl font-bold text-zinc-900">
                Spotify/YouTube 연결 관리
              </h1>
            </div>
          </div>
        </div>

        {/* 탭 버튼 */}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("songs")}
            className={[
              "cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition",
              activeTab === "songs"
                ? "bg-zinc-900 text-white"
                : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
            ].join(" ")}
          >
            곡 목록 ({stats.total.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("youtube")}
            className={[
              "cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition",
              activeTab === "youtube"
                ? "bg-red-600 text-white"
                : "bg-white border border-zinc-200 text-zinc-700 hover:bg-red-50 hover:border-red-200",
            ].join(" ")}
          >
            미연결 유튜브 {youtubeLoaded && `(${unlinkedYoutubeVideos.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("spotify")}
            className={[
              "cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition",
              activeTab === "spotify"
                ? "bg-emerald-600 text-white"
                : "bg-white border border-zinc-200 text-zinc-700 hover:bg-emerald-50 hover:border-emerald-200",
            ].join(" ")}
          >
            미연결 스포티파이 {spotifyLoaded && `(${unlinkedSpotifyTracks.length})`}
          </button>
        </div>

        {/* 곡 목록 탭 */}
        {activeTab === "songs" && (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
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
                  {filter === "youtube" && (
                    <button
                      type="button"
                      onClick={handleCopyYoutubeMissingJson}
                      className="cursor-pointer shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                    >
                      JSON 추출
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={loadSongs}
                    className="cursor-pointer shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    disabled={loading}
                  >
                    {loading ? "로딩..." : "새로고침"}
                  </button>
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
                              <span className="ml-2 flex flex-wrap gap-1 text-sm">
                                {song.artists.map((artist, index) => (
                                  <span key={artist.id} className="inline-flex items-center gap-1">
                                    {artist.nameKo
                                      ? `${artist.nameKo} (${artist.name})`
                                      : artist.name}
                                    <span className="text-xs text-zinc-500">#{artist.id}</span>
                                    {index < song.artists.length - 1 && (
                                      <span className="text-zinc-400">,</span>
                                    )}
                                  </span>
                                ))}
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
                              href={`/manager?songId=${song.id}`}
                              className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700"
                            >
                              매니저
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* 미연결 유튜브 영상 탭 */}
        {activeTab === "youtube" && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Song에 연결되지 않은 유튜브 영상 (조회수순 Top 100)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const clipboardText = await navigator.clipboard.readText();
                    const result = await applyYoutubeMappingFromJson(clipboardText || undefined);
                    if (result.success) {
                      alert(`매핑 완료: ${result.mappedCount}개 적용됨`);
                      loadUnlinkedYoutubeVideos();
                    } else {
                      alert(`오류: ${result.error}`);
                    }
                  }}
                  className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  적용하기
                </button>
                <button
                  type="button"
                  onClick={loadUnlinkedYoutubeVideos}
                  className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:border-red-300 hover:text-red-700"
                  disabled={loadingYoutube}
                >
                  {loadingYoutube ? "로딩 중..." : "새로고침"}
                </button>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {loadingYoutube ? (
                <div className="px-6 py-12 text-center text-sm text-zinc-500">
                  미연결 유튜브 영상을 불러오는 중...
                </div>
              ) : unlinkedYoutubeVideos.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-zinc-500">
                  미연결 유튜브 영상이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {unlinkedYoutubeVideos.map((video) => (
                    <div
                      key={video.videoId}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      {video.thumbnailMedium && (
                        <a
                          href={`https://www.youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={video.thumbnailMedium}
                            alt={video.title}
                            className="w-32 h-18 object-cover rounded-lg"
                          />
                        </a>
                      )}
                      <div className="flex-1 min-w-0">
                        <a
                          href={`https://www.youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-zinc-900 hover:text-red-600 cursor-pointer line-clamp-2"
                        >
                          {video.title}
                        </a>
                        {video.artistId && (
                          <p className="text-sm text-zinc-500 mt-1">
                            <span className="text-zinc-400">#{video.artistId}</span>{" "}
                            {video.artistNameKo} ({video.artistName})
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span className="font-semibold text-red-600">
                            조회수 {video.viewCount.toLocaleString()}
                          </span>
                          {video.publishedAt && (
                            <span>
                              {new Date(video.publishedAt).toLocaleDateString("ko-KR")}
                            </span>
                          )}
                        </div>
                      </div>
                      {video.artistId && (
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await extractArtistJson(video.artistId!);
                            if (result.success && result.jsonString) {
                              await navigator.clipboard.writeText(result.jsonString);
                            }
                          }}
                          className="cursor-pointer shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                        >
                          JSON 추출
                        </button>
                      )}
                      <Link
                        href={`/manager?youtube=${video.videoId}`}
                        className="cursor-pointer shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:border-red-300 hover:text-red-700"
                      >
                        매니저
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 미연결 스포티파이 트랙 탭 */}
        {activeTab === "spotify" && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Song에 연결되지 않은 스포티파이 트랙 (인기도순 Top 100)
              </p>
              <button
                type="button"
                onClick={loadUnlinkedSpotifyTracks}
                className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700"
                disabled={loadingSpotify}
              >
                {loadingSpotify ? "로딩 중..." : "새로고침"}
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {loadingSpotify ? (
                <div className="px-6 py-12 text-center text-sm text-zinc-500">
                  미연결 스포티파이 트랙을 불러오는 중...
                </div>
              ) : unlinkedSpotifyTracks.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-zinc-500">
                  미연결 스포티파이 트랙이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {unlinkedSpotifyTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      {track.thumbnails.length > 0 && (
                        <a
                          href={`https://open.spotify.com/track/${track.spotifyId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={track.thumbnails[0]}
                            alt={track.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        </a>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 line-clamp-1">
                          {track.name}
                        </p>
                        {track.spotifyArtists.length > 0 && (
                          <p className="text-sm text-zinc-500 mt-1">
                            {track.spotifyArtists.map((artist, idx) => (
                              <span key={idx} className="mr-3">
                                {artist.artistId ? (
                                  <>
                                    <span className="text-emerald-600">#{artist.artistId}</span>{" "}
                                    {artist.name}
                                  </>
                                ) : (
                                  <span className="text-zinc-400">{artist.name}</span>
                                )}
                              </span>
                            ))}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span className="font-semibold text-emerald-600">
                            인기도 {track.popularity}
                          </span>
                          {track.releaseDate && (
                            <span>{track.releaseDate}</span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/manager?spotify=${track.spotifyId}`}
                        className="cursor-pointer shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        매니저
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
