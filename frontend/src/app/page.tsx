"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useArtistsControllerFindAll } from "@/api/model/artists/artists";
import { searchControllerGetYoutubeOembed } from "@/api/model/search/search";
import { songsControllerFindAll } from "@/api/model/songs/songs";
import { mapResponseData } from "@/api/utils";
import type { ArtistWithYoutube } from "@/types/models";

export default function Home() {
  const {
    data: artists = [],
    isLoading,
    error,
  } = useArtistsControllerFindAll<ArtistWithYoutube[]>(
    { includeYoutube: "true" },
    {
      query: {
        select: mapResponseData<ArtistWithYoutube[]>([]),
      },
    },
  );
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchLog, setSearchLog] = useState<string[]>([]);
  const router = useRouter();
  const queryError = error instanceof Error ? error : null;

  const handleYoutubeSearch = async () => {
    if (!youtubeUrl.trim()) return;

    setSearching(true);
    setSearchLog([]);

    try {
      // Fetch YouTube title
      setSearchLog((prev) => [...prev, `유튜브 정보 가져오는 중...`]);
      const youtubeResponse = await searchControllerGetYoutubeOembed({
        url: youtubeUrl,
      });
      const youtubeData = mapResponseData()(youtubeResponse);
      const title = youtubeData.title;
      setSearchLog((prev) => [...prev, `✓ 제목: ${title}`]);

      // Search for song
      setSearchLog((prev) => [...prev, `곡 검색 중...`]);
      const songsResponse = await songsControllerFindAll();
      const songs = mapResponseData([])(songsResponse);

      const foundSong = songs.find(
        (song) =>
          song.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(song.title.toLowerCase()) ||
          (song.titleKo &&
            title.toLowerCase().includes(song.titleKo.toLowerCase())),
      );

      if (foundSong) {
        setSearchLog((prev) => [
          ...prev,
          `✓ 곡을 찾았습니다: ${foundSong.title}`,
        ]);

        // Get artist from already loaded data
        const artist = artists.find((a) => a.id === foundSong.artistId);

        if (artist) {
          setSearchLog((prev) => [
            ...prev,
            `✓ ${artist.nameKo} 페이지로 이동합니다...`,
          ]);
          setTimeout(() => {
            router.push(`/channel/${artist.alias}#${foundSong.id}`);
          }, 500);
        } else {
          setSearchLog((prev) => [
            ...prev,
            `❌ 아티스트 정보를 찾을 수 없습니다.`,
          ]);
        }
      } else {
        setSearchLog((prev) => [...prev, `❌ 해당 곡을 찾을 수 없습니다.`]);
      }
    } catch (error) {
      setSearchLog((prev) => [...prev, `❌ 오류가 발생했습니다: ${error}`]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            노래방 검색
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            아티스트를 선택하거나 유튜브 링크로 검색하세요
          </p>
        </header>

        <div className="mb-12">
          <div className="mb-4">
            <label
              htmlFor="youtube-search-input"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              유튜브 링크로 검색
            </label>
            <div className="flex gap-2">
              <input
                id="youtube-search-input"
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleYoutubeSearch()}
                placeholder="https://music.youtube.com/watch?v=..."
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
                disabled={searching}
              />
              <button
                type="button"
                onClick={handleYoutubeSearch}
                disabled={searching || !youtubeUrl.trim()}
                className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
              >
                {searching ? "검색 중..." : "검색"}
              </button>
            </div>
          </div>

          {searchLog.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="space-y-1 font-mono text-sm">
                {searchLog.map((log) => (
                  <div key={log} className="text-zinc-700 dark:text-zinc-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            로딩 중...
          </div>
        )}

        {queryError && (
          <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            에러가 발생했습니다: {queryError.message}
          </div>
        )}

        {artists.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/channel/${artist.alias}`}
                className="group rounded-lg border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 overflow-hidden"
              >
                {artist.youtube?.thumbnail && (
                  <div className="aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <Image
                      src={artist.youtube.thumbnail}
                      alt={artist.nameKo}
                      width={320}
                      height={180}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
                    {artist.nameKo}
                  </h2>
                  <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-500">
                    {artist.name}
                  </p>
                  {artist.youtube?.subscriberCount && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      구독자 {artist.youtube.subscriberCount.toLocaleString()}명
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
