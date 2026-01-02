"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  getArtists,
  getSongsByArtist,
  updateArtistAlias,
  updateYoutubeChannel,
} from "./actions";

const SORT_OPTIONS = [
  { value: "id_desc", label: "최신" },
  { value: "name_asc", label: "이름 ↑" },
  { value: "name_desc", label: "이름 ↓" },
  { value: "subscriber_desc", label: "구독자 ↑" },
  { value: "subscriber_asc", label: "구독자 ↓" },
  { value: "song_count_desc", label: "곡 ↑" },
  { value: "song_count_asc", label: "곡 ↓" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];
const DEFAULT_SORT: SortOption = "name_asc";

type Artist = Awaited<ReturnType<typeof getArtists>>[number];
type Song = Awaited<ReturnType<typeof getSongsByArtist>>[number];

export default function AdminArtistsPage() {
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);

  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aliasMenuOpen, setAliasMenuOpen] = useState(false);
  const aliasMenuRef = useRef<HTMLDivElement | null>(null);
  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);

  // YouTube 채널 관리
  const [showYoutubeSection, setShowYoutubeSection] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 아티스트 목록 로드
  useEffect(() => {
    setArtistsLoading(true);
    getArtists(sort)
      .then(setArtists)
      .finally(() => setArtistsLoading(false));
  }, [sort]);

  // 선택된 아티스트의 곡 목록 로드
  useEffect(() => {
    if (!selectedArtist) {
      setSongs([]);
      return;
    }

    setSongsLoading(true);
    getSongsByArtist(selectedArtist.id)
      .then(setSongs)
      .finally(() => setSongsLoading(false));
  }, [selectedArtist]);

  useEffect(() => {
    setAliasMenuOpen(false);
    setShowAliasDialog(false);
    setAliasError(null);
    setAliasInput(selectedArtist?.alias ?? "");
  }, [selectedArtist]);

  const filteredArtists = artists.filter(
    (artist) =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.nameKo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.alias?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 초기 로드시 URL 해시로부터 아티스트 선택
  useEffect(() => {
    if (!filteredArtists || filteredArtists.length === 0 || selectedArtist)
      return;

    const hash = window.location.hash;
    if (hash) {
      const artistId = parseInt(hash.replace("#", ""), 10);
      const artist = filteredArtists.find((a) => a.id === artistId);
      if (artist) {
        setSelectedArtist(artist);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredArtists, selectedArtist]);

  // 아티스트 선택시 URL 해시 업데이트
  useEffect(() => {
    if (selectedArtist) {
      window.history.replaceState(null, "", `#${selectedArtist.id}`);

      // 선택된 아티스트로 스크롤
      const element = document.getElementById(`artist-${selectedArtist.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedArtist]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!filteredArtists || filteredArtists.length === 0) return;

      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();

        const currentIndex = selectedArtist
          ? filteredArtists.findIndex((a) => a.id === selectedArtist.id)
          : -1;

        let nextIndex: number;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          nextIndex =
            currentIndex < filteredArtists.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : filteredArtists.length - 1;
        }

        setSelectedArtist(filteredArtists[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredArtists, selectedArtist]);

  useEffect(() => {
    if (!aliasMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        aliasMenuRef.current &&
        !aliasMenuRef.current.contains(event.target as Node)
      ) {
        setAliasMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [aliasMenuOpen]);

  const extractChannelId = (url: string): string | null => {
    const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelMatch) return channelMatch[1];

    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) return `@${handleMatch[1]}`;

    const customMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
    if (customMatch) return customMatch[1];

    if (url.startsWith("UC") || url.startsWith("@")) {
      return url;
    }

    return null;
  };

  const handleUpdateChannel = async () => {
    if (!selectedArtist || !channelUrl.trim()) {
      setMessage({
        type: "error",
        text: "채널 URL을 입력해주세요.",
      });
      return;
    }

    const channelId = extractChannelId(channelUrl);
    if (!channelId) {
      setMessage({
        type: "error",
        text: "올바른 YouTube 채널 URL을 입력해주세요.",
      });
      return;
    }

    setMessage(null);
    setUpdating(true);

    try {
      const response = await updateYoutubeChannel(selectedArtist.id, channelId);

      setMessage({
        type: "success",
        text: `✅ ${selectedArtist.nameKo}: ${
          response.channelTitle ?? response.message
        }`,
      });
      setChannelUrl("");

      // 아티스트 목록 새로고침
      const updatedArtists = await getArtists(sort);
      setArtists(updatedArtists);

      // 선택된 아티스트 업데이트
      const updatedArtist = updatedArtists.find(
        (a) => a.id === selectedArtist.id,
      );
      if (updatedArtist) {
        setSelectedArtist(updatedArtist);
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ 오류 발생: ${error.message}`,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAliasSave = async () => {
    if (!selectedArtist) return;

    const sanitizedAlias = aliasInput.trim().replace(/^@/, "");
    if (!sanitizedAlias) {
      setAliasError("별칭을 입력해주세요.");
      return;
    }

    setAliasSaving(true);
    setAliasError(null);

    try {
      const response = await updateArtistAlias(
        selectedArtist.id,
        sanitizedAlias,
      );

      setMessage({
        type: "success",
        text: `✅ ${selectedArtist.nameKo}: @${
          response.alias ?? sanitizedAlias
        }로 저장되었습니다.`,
      });

      const updatedArtists = await getArtists(sort);
      setArtists(updatedArtists);

      const updatedArtist = updatedArtists.find(
        (a) => a.id === selectedArtist.id,
      );
      if (updatedArtist) {
        setSelectedArtist(updatedArtist);
      }

      setShowAliasDialog(false);
      setAliasMenuOpen(false);
    } catch (error: any) {
      setAliasError(error.message ?? "별칭 저장 중 오류가 발생했습니다.");
    } finally {
      setAliasSaving(false);
    }
  };

  const youtubeInfo = selectedArtist?.youtube;

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Artist & Songs 관리
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          아티스트와 곡을 관리합니다
        </p>
      </div>

      {/* Search */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="아티스트 검색..."
          className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />
      </div>

      {/* Message */}
      {message && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
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

      {/* 2-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Artist List */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
          {/* Artist List Header */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
              Artists ({filteredArtists.length})
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <label htmlFor="artists-sort" className="sr-only">
                정렬
              </label>
              <select
                id="artists-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Artist List */}
          <div className="flex-1 overflow-y-auto">
            {artistsLoading && (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                로딩 중...
              </div>
            )}

            {filteredArtists.map((artist) => (
              <button
                type="button"
                key={artist.id}
                id={`artist-${artist.id}`}
                onClick={() => setSelectedArtist(artist)}
                className={`w-full px-4 py-3 text-left border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                  selectedArtist?.id === artist.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {artist.thumbnailHigh ||
                  artist.thumbnailMedium ||
                  artist.thumbnailDefault ? (
                    <Image
                      src={
                        artist.thumbnailHigh ||
                        artist.thumbnailMedium ||
                        artist.thumbnailDefault ||
                        ""
                      }
                      alt={artist.nameKo}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {artist.nameKo}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {artist.name}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {artist.songCount}
                  </div>
                </div>
              </button>
            ))}

            {filteredArtists.length === 0 && !artistsLoading && (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Right: Song List */}
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
          {selectedArtist ? (
            <>
              {/* Artist Info Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="flex items-center gap-3">
                  {selectedArtist.thumbnailHigh ||
                  selectedArtist.thumbnailMedium ||
                  selectedArtist.thumbnailDefault ? (
                    <Image
                      src={
                        selectedArtist.thumbnailHigh ||
                        selectedArtist.thumbnailMedium ||
                        selectedArtist.thumbnailDefault ||
                        ""
                      }
                      alt={selectedArtist.nameKo}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {selectedArtist.nameKo}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {selectedArtist.name}
                      {selectedArtist.alias && (
                        <>
                          {" • "}
                          <span
                            className="relative inline-block"
                            ref={aliasMenuRef}
                          >
                            <button
                              type="button"
                              onClick={() => setAliasMenuOpen((prev) => !prev)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                            >
                              @{selectedArtist.alias}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            {aliasMenuOpen && (
                              <div className="absolute right-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                                <a
                                  href={`/channel/${selectedArtist.alias}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setAliasMenuOpen(false)}
                                  className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                  아티스트 페이지로 이동
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAliasMenuOpen(false);
                                    setShowAliasDialog(true);
                                    setAliasError(null);
                                    setAliasInput(selectedArtist.alias ?? "");
                                  }}
                                  className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                  별칭 수정
                                </button>
                              </div>
                            )}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedArtist.alias && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowYoutubeSection(!showYoutubeSection)
                        }
                        className="rounded-lg p-2 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="YouTube 정보"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 159 110"
                          className="h-6 w-9"
                          role="img"
                          aria-label="YouTube"
                        >
                          <path
                            fill="#FF0000"
                            d="M154 17.5c-1.82-6.73-7.07-12-13.8-13.8-9.04-3.49-96.6-5.2-122 0.1-6.73 1.82-12 7.07-13.8 13.8-4.08 17.9-4.39 56.6 0.1 74.9 1.82 6.73 7.07 12 13.8 13.8 17.9 4.12 103 4.7 122 0 6.73-1.82 12-7.07 13.8-13.8 4.35-19.5 4.66-55.8-0.1-75z"
                          />
                          <path fill="#FFF" d="M105 55L64.2 31.6v46.8z" />
                        </svg>
                      </button>
                    )}
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {selectedArtist.songCount}곡
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable YouTube Section */}
              {showYoutubeSection && selectedArtist.alias && (
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    YouTube 채널 정보
                  </h3>

                  {/* Current YouTube Info */}
                  {youtubeInfo ? (
                    <div className="mb-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="space-y-2">
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            {youtubeInfo.title}
                          </div>
                          <a
                            href={
                              youtubeInfo.customUrl
                                ? `https://youtube.com/${youtubeInfo.customUrl}`
                                : `https://youtube.com/channel/${youtubeInfo.channelId}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {youtubeInfo.customUrl || youtubeInfo.channelId}
                          </a>
                        </div>
                        {youtubeInfo.subscriberCount && (
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            구독자{" "}
                            {youtubeInfo.subscriberCount.toLocaleString()}명
                          </div>
                        )}
                        {youtubeInfo.videoCount && (
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            동영상 {youtubeInfo.videoCount.toLocaleString()}개
                          </div>
                        )}
                        {youtubeInfo.description && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                            {youtubeInfo.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        채널 정보가 없습니다
                      </p>
                    </div>
                  )}

                  {/* Update Channel Form */}
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="channel-url-input"
                        className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        YouTube 채널 URL
                      </label>
                      <input
                        id="channel-url-input"
                        type="text"
                        value={channelUrl}
                        onChange={(e) => setChannelUrl(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleUpdateChannel()
                        }
                        placeholder="https://www.youtube.com/channel/UCxxx 또는 https://www.youtube.com/@channelname"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        채널 페이지 URL을 복사해서 붙여넣기 하세요
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUpdateChannel}
                      disabled={updating || !channelUrl.trim()}
                      className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                    >
                      {updating ? "처리 중..." : "채널 정보 업데이트"}
                    </button>
                  </div>
                </div>
              )}

              {/* Song List */}
              <div className="flex-1 overflow-y-auto p-6">
                {songsLoading && (
                  <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    로딩 중...
                  </div>
                )}

                {songs && songs.length === 0 && (
                  <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    곡이 없습니다
                  </div>
                )}

                <div className="space-y-2">
                  {songs.map((song) => (
                    <div
                      key={song.id}
                      className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            {song.title}
                          </div>
                          {song.titleKo && song.titleKo !== song.title && (
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {song.titleKo}
                            </div>
                          )}

                          {song.karaokeSongs &&
                            song.karaokeSongs.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {song.karaokeSongs.map((kn) => (
                                  <span
                                    key={`${kn.provider}-${kn.karaokeNo}`}
                                    className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                  >
                                    {kn.provider} {kn.karaokeNo}
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-zinc-500 dark:text-zinc-400">
                <svg
                  className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  role="img"
                  aria-label="No artist selected"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                <p className="text-sm">왼쪽에서 아티스트를 선택하세요</p>
              </div>
            </div>
          )}
        </div>

        {showAliasDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                별칭 수정
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                새로운 별칭을 입력하면 바로 적용됩니다.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="alias-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  새 별칭
                </label>
                <input
                  id="alias-input"
                  type="text"
                  value={aliasInput}
                  autoFocus
                  onChange={(e) => {
                    setAliasInput(e.target.value);
                    if (aliasError) setAliasError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAliasSave();
                    }
                  }}
                  placeholder="yuika"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  '@' 없이 입력하세요. 예) yuika
                </p>
                {aliasError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {aliasError}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAliasDialog(false);
                    setAliasError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleAliasSave}
                  disabled={aliasSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                >
                  {aliasSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
