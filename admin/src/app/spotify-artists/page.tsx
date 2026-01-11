"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getArtistsBySpotifyId,
  getArtistsWithDuplicateSpotifyId,
  getSongsByArtistId,
  mergeArtist,
  removeSpotifyId,
  updateSpotifyId,
} from "./actions";

type Artist = Awaited<ReturnType<typeof getArtistsWithDuplicateSpotifyId>>[number];

export default function SpotifyArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [relatedArtists, setRelatedArtists] = useState<Artist[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newSpotifyId, setNewSpotifyId] = useState("");
  const [isEditingSpotifyId, setIsEditingSpotifyId] = useState(false);

  // 관련 아티스트 카드의 스포티파이 ID 편집
  const [editingRelatedArtistId, setEditingRelatedArtistId] = useState<number | null>(null);
  const [relatedArtistNewSpotifyId, setRelatedArtistNewSpotifyId] = useState("");

  // 곡 보기 다이얼로그
  const [viewingSongsArtist, setViewingSongsArtist] = useState<Artist | null>(null);
  const [viewingSongs, setViewingSongs] = useState<any[]>([]);
  const [viewingSongsLoading, setViewingSongsLoading] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  // 아티스트 로드
  const loadArtists = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const newArtists = await getArtistsWithDuplicateSpotifyId(currentOffset, 500);

      if (reset) {
        setArtists(newArtists);
        setOffset(500);
      } else {
        setArtists((prev) => [...prev, ...newArtists]);
        setOffset((prev) => prev + 500);
      }

      setHasMore(newArtists.length === 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "아티스트 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  // 초기 로드
  useEffect(() => {
    loadArtists(true);
  }, []);

  // 무한 스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadArtists();
        }
      },
      { threshold: 1.0 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadArtists]);

  // URL 해시에서 아티스트 ID 파싱
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash) {
      const artistId = Number.parseInt(hash.replace("#", ""), 10);
      if (Number.isFinite(artistId) && artistId > 0) {
        const artist = artists.find((a) => a.id === artistId);
        if (artist) {
          setSelectedArtist(artist);
        }
      }
    }
  }, [artists]);

  // 선택된 아티스트 변경 시 관련 아티스트 로드
  useEffect(() => {
    if (!selectedArtist?.spotifyId) {
      setRelatedArtists([]);
      return;
    }

    const loadRelated = async () => {
      setRelatedLoading(true);
      try {
        const related = await getArtistsBySpotifyId(selectedArtist.spotifyId!);
        setRelatedArtists(related);
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "관련 아티스트 로드 실패",
        });
      } finally {
        setRelatedLoading(false);
      }
    };

    loadRelated();
  }, [selectedArtist]);

  // 선택된 아티스트 변경 시 편집 상태 초기화
  useEffect(() => {
    setIsEditingSpotifyId(false);
    setNewSpotifyId(selectedArtist?.spotifyId || "");
  }, [selectedArtist]);

  // URL 해시 업데이트
  useEffect(() => {
    if (selectedArtist) {
      window.history.replaceState(null, "", `#${selectedArtist.id}`);
    }
  }, [selectedArtist]);

  // 스포티파이 ID 제거 핸들러
  const handleRemoveSpotifyId = async (artistId: number) => {
    if (!confirm("정말 이 아티스트의 스포티파이 ID를 제거하시겠습니까?")) {
      return;
    }

    const result = await removeSpotifyId(artistId);

    if (result.success) {
      setMessage({ type: "success", text: "스포티파이 ID가 제거되었습니다." });
      // 새로고침
      await loadArtists(true);
      if (selectedArtist?.spotifyId) {
        const related = await getArtistsBySpotifyId(selectedArtist.spotifyId);
        setRelatedArtists(related);
      }
    } else {
      setMessage({ type: "error", text: result.error || "스포티파이 ID 제거 실패" });
    }
  };

  // 가수 병합 핸들러
  const handleMergeArtist = async (fromArtistId: number, toArtistId: number) => {
    const fromArtist = relatedArtists.find((a) => a.id === fromArtistId);
    const toArtist = selectedArtist;

    if (!fromArtist || !toArtist) return;

    if (
      !confirm(
        `"${fromArtist.nameKo} (${fromArtist.name})"의 모든 곡을 "${toArtist.nameKo} (${toArtist.name})"로 이전하시겠습니까?\n\n곡 수: ${fromArtist.songCount}개`
      )
    ) {
      return;
    }

    const result = await mergeArtist(fromArtistId, toArtistId);

    if (result.success) {
      setMessage({
        type: "success",
        text: `${result.movedSongsCount}개의 곡이 이전되었습니다.`,
      });
      // 새로고침
      await loadArtists(true);
      if (selectedArtist?.spotifyId) {
        const related = await getArtistsBySpotifyId(selectedArtist.spotifyId);
        setRelatedArtists(related);
      }
    } else {
      setMessage({ type: "error", text: result.error || "가수 병합 실패" });
    }
  };

  // 스포티파이 ID 변경 핸들러 (중앙 섹션)
  const handleUpdateSpotifyId = async () => {
    if (!selectedArtist) return;

    const result = await updateSpotifyId(selectedArtist.id, newSpotifyId);

    if (result.success) {
      setMessage({ type: "success", text: "스포티파이 ID가 변경되었습니다." });
      setIsEditingSpotifyId(false);
      // 새로고침
      await loadArtists(true);
    } else {
      setMessage({ type: "error", text: result.error || "스포티파이 ID 변경 실패" });
    }
  };

  // 관련 아티스트 스포티파이 ID 변경 핸들러
  const handleUpdateRelatedArtistSpotifyId = async (artistId: number) => {
    const result = await updateSpotifyId(artistId, relatedArtistNewSpotifyId);

    if (result.success) {
      setMessage({ type: "success", text: "스포티파이 ID가 변경되었습니다." });
      setEditingRelatedArtistId(null);
      setRelatedArtistNewSpotifyId("");
      // 새로고침
      await loadArtists(true);
      if (selectedArtist?.spotifyId) {
        const related = await getArtistsBySpotifyId(selectedArtist.spotifyId);
        setRelatedArtists(related);
      }
    } else {
      setMessage({ type: "error", text: result.error || "스포티파이 ID 변경 실패" });
    }
  };

  // 곡 보기 핸들러
  const handleViewSongs = async (artist: Artist) => {
    setViewingSongsArtist(artist);
    setViewingSongsLoading(true);
    try {
      const songs = await getSongsByArtistId(artist.id);
      setViewingSongs(songs);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "곡 로드 실패",
      });
    } finally {
      setViewingSongsLoading(false);
    }
  };

  // 메시지 자동 삭제
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
            >
              <path
                d="M15 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">스포티파이 아티스트 중복 관리</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              같은 Spotify ID를 가진 아티스트들을 관리합니다
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Section - 아티스트 리스트 */}
        <div className="flex w-96 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="font-semibold">중복 스포티파이 ID 아티스트</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              총 {artists.length}명
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && artists.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">로딩 중...</div>
            ) : error ? (
              <div className="p-4 text-sm text-red-500">{error}</div>
            ) : artists.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">
                중복된 스포티파이 ID가 없습니다.
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {artists.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => setSelectedArtist(artist)}
                    className={`w-full cursor-pointer rounded-lg border p-3 text-left transition ${
                      selectedArtist?.id === artist.id
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10"
                        : "border-zinc-200 hover:border-sky-200 hover:bg-sky-50/50 dark:border-zinc-800 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {artist.thumbnailDefault && (
                        <img
                          src={artist.thumbnailDefault}
                          alt={artist.name}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold">{artist.nameKo}</div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          {artist.name}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          ID: {artist.id} · 곡: {artist.songCount}개
                        </div>
                        {artist.spotifyId ? (
                          <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                            Spotify: {artist.spotifyId}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-zinc-400">
                            Spotify ID 없음
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {hasMore && (
                  <div ref={observerTarget} className="py-4 text-center text-sm text-zinc-500">
                    {loading ? "로딩 중..." : "스크롤하여 더 보기"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section - 관련 아티스트 */}
        <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
          {!selectedArtist ? (
            <div className="flex flex-1 items-center justify-center text-zinc-500">
              왼쪽에서 아티스트를 선택하세요
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start gap-4">
                  {selectedArtist.thumbnailDefault && (
                    <img
                      src={selectedArtist.thumbnailDefault}
                      alt={selectedArtist.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{selectedArtist.nameKo}</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {selectedArtist.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>ID: {selectedArtist.id}</span>
                      <span>·</span>
                      <span>곡: {selectedArtist.songCount}개</span>
                      {selectedArtist.spotifyId && (
                        <>
                          <span>·</span>
                          <span className="text-green-600 dark:text-green-400">
                            Spotify: {selectedArtist.spotifyId}
                          </span>
                        </>
                      )}
                    </div>
                    {selectedArtist.spotifyArtist && (
                      <div className="mt-2 text-sm">
                        <div className="font-medium">
                          {selectedArtist.spotifyArtist.name}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          인기도: {selectedArtist.spotifyArtist.popularity ?? "N/A"} · 팔로워:{" "}
                          {selectedArtist.spotifyArtist.followers?.toLocaleString() ?? "N/A"}
                        </div>
                        {selectedArtist.spotifyArtist.genres.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {selectedArtist.spotifyArtist.genres.map((genre) => (
                              <span
                                key={genre}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 스포티파이 ID 변경 */}
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Spotify ID:
                    </label>
                    {isEditingSpotifyId ? (
                      <>
                        <input
                          type="text"
                          value={newSpotifyId}
                          onChange={(e) => setNewSpotifyId(e.target.value)}
                          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                          placeholder="새 Spotify ID 입력"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateSpotifyId}
                          className="cursor-pointer rounded bg-green-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-green-700"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingSpotifyId(false);
                            setNewSpotifyId(selectedArtist?.spotifyId || "");
                          }}
                          className="cursor-pointer rounded bg-zinc-400 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-500"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {selectedArtist.spotifyId || "(없음)"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingSpotifyId(true)}
                          className="cursor-pointer rounded border border-blue-300 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                        >
                          변경
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="mb-4 text-lg font-semibold">
                  같은 Spotify ID를 가진 아티스트들 ({relatedArtists.length}명)
                </h3>

                {relatedLoading ? (
                  <div className="text-sm text-zinc-500">로딩 중...</div>
                ) : relatedArtists.length === 0 ? (
                  <div className="text-sm text-zinc-500">관련 아티스트가 없습니다.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedArtists.map((artist) => (
                      <div
                        key={artist.id}
                        className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="flex items-start gap-3">
                          {artist.thumbnailDefault && (
                            <img
                              src={artist.thumbnailDefault}
                              alt={artist.name}
                              className="h-12 w-12 rounded-md object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold">{artist.nameKo}</div>
                              <a
                                href={`https://open.spotify.com/search/${encodeURIComponent(artist.name)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="cursor-pointer rounded bg-green-600 px-2 py-0.5 text-xs text-white transition hover:bg-green-700"
                                title="Spotify에서 검색"
                              >
                                🎵
                              </a>
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                              {artist.name}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              ID: {artist.id} · 곡: {artist.songCount}개
                            </div>
                          </div>
                        </div>

                        {/* 스포티파이 ID 변경 */}
                        <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                          {editingRelatedArtistId === artist.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                value={relatedArtistNewSpotifyId}
                                onChange={(e) => setRelatedArtistNewSpotifyId(e.target.value)}
                                className="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                                placeholder="새 Spotify ID"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRelatedArtistSpotifyId(artist.id)}
                                  className="flex-1 cursor-pointer rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-green-700"
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRelatedArtistId(null);
                                    setRelatedArtistNewSpotifyId("");
                                  }}
                                  className="flex-1 cursor-pointer rounded bg-zinc-400 px-2 py-1 text-xs font-medium text-white transition hover:bg-zinc-500"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 overflow-hidden">
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  Spotify ID:
                                </div>
                                <div className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  {artist.spotifyId || "(없음)"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRelatedArtistId(artist.id);
                                  setRelatedArtistNewSpotifyId(artist.spotifyId || "");
                                }}
                                className="cursor-pointer rounded border border-purple-300 bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 transition hover:bg-purple-100 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
                              >
                                변경
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewSongs(artist)}
                            className="w-full cursor-pointer rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                          >
                            곡 보기 ({artist.songCount}개)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpotifyId(artist.id)}
                            className="w-full cursor-pointer rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                          >
                            스포티파이 ID 제거
                          </button>
                          {artist.id !== selectedArtist.id && (
                            <button
                              type="button"
                              onClick={() =>
                                handleMergeArtist(artist.id, selectedArtist.id)
                              }
                              className="w-full cursor-pointer rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                            >
                              → {selectedArtist.nameKo}에 병합
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 곡 보기 다이얼로그 */}
      {viewingSongsArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {viewingSongsArtist.nameKo} ({viewingSongsArtist.name})
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  총 {viewingSongsArtist.songCount}곡
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingSongsArtist(null);
                  setViewingSongs([]);
                }}
                className="cursor-pointer rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {viewingSongsLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
                  로딩 중...
                </div>
              ) : viewingSongs.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
                  곡이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {viewingSongs.map((song) => (
                    <div
                      key={song.id}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <div className="flex items-start gap-3">
                        {song.thumbnailDefault && (
                          <img
                            src={song.thumbnailDefault}
                            alt={song.title}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {song.titleKo || song.title}
                          </div>
                          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {song.title}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>ID: {song.id}</span>
                            {song.catalog && (
                              <>
                                <span>·</span>
                                <span className="rounded bg-zinc-200 px-2 py-0.5 dark:bg-zinc-700">
                                  {song.catalog}
                                </span>
                              </>
                            )}
                            {song.youtubeVideoId && (
                              <>
                                <span>·</span>
                                <a
                                  href={`https://www.youtube.com/watch?v=${song.youtubeVideoId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-red-600 hover:underline dark:text-red-400"
                                >
                                  YouTube
                                </a>
                              </>
                            )}
                          </div>

                          {/* 노래방 번호 */}
                          {song.karaokeSongs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {song.karaokeSongs.map((ks: any) => (
                                <span
                                  key={`${ks.provider}-${ks.karaokeNo}`}
                                  className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                  {ks.provider} {ks.karaokeNo}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* 소유 아티스트 */}
                          {song.artists.length > 1 && (
                            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              공동 소유: {song.artists.filter((a: any) => a.id !== viewingSongsArtist.id).map((a: any) => a.nameKo).join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
