"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { searchSongByYoutubeUrl } from "@/api/custom/searchSongByYoutubeUrl";
import { useArtistsControllerFindAll } from "@/api/model/artists/artists";
import { ArtistsControllerFindAllSort } from "@/api/model/models";

const SORT_OPTIONS = [
  { value: ArtistsControllerFindAllSort.id_desc, label: "최신 등록순" },
  { value: ArtistsControllerFindAllSort.name_asc, label: "이름 오름차순" },
  { value: ArtistsControllerFindAllSort.name_desc, label: "이름 내림차순" },
  {
    value: ArtistsControllerFindAllSort.subscriber_desc,
    label: "구독자 많은 순",
  },
  {
    value: ArtistsControllerFindAllSort.subscriber_asc,
    label: "구독자 적은 순",
  },
  { value: ArtistsControllerFindAllSort.song_count_desc, label: "곡 많은 순" },
  { value: ArtistsControllerFindAllSort.song_count_asc, label: "곡 적은 순" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];
const DEFAULT_SORT: SortOption = ArtistsControllerFindAllSort.subscriber_desc;

export default function Home() {
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT);
  const { data, isLoading, error } = useArtistsControllerFindAll({
    sort,
  });
  const artists = data?.data ?? [];
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const router = useRouter();
  const queryError = error instanceof Error ? error : null;

  const handleYoutubeSearch = async () => {
    if (!youtubeUrl.trim()) return;

    setSearching(true);
    setSearchError(null);

    try {
      const response = await searchSongByYoutubeUrl({
        url: youtubeUrl.trim(),
      });

      const song = response.data;

      if (!song) {
        const message = response.message
          ? `"${response.message}"에 해당하는 곡을 찾을 수 없습니다.`
          : "해당 곡을 찾을 수 없습니다.";
        setSearchError(`❌ ${message}`);
        return;
      }

      const artist = artists.find((a) => a.id === song.artists[0].artistId);

      if (!artist) {
        setSearchError(`❌ 아티스트 정보를 찾을 수 없습니다.`);
        return;
      }

      setTimeout(() => {
        router.push(`/channel/${artist.alias ?? artist.id}#${song.id}`);
      }, 200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown");
      setSearchError(`❌ 오류가 발생했습니다: ${message}`);
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

        <div className="mb-12 space-y-6">
          <div>
            <label
              htmlFor="artist-sort"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              정렬
            </label>
            <select
              id="artist-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400 sm:w-64"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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

          {searchError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {searchError}
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
            {artists.map((artist) => {
              const displayThumbnail =
                artist.thumbnailHigh ||
                artist.thumbnailMedium ||
                artist.thumbnailDefault;

              return (
                <Link
                  key={artist.id}
                  href={`/channel/${artist.alias ?? artist.id}`}
                  className="group rounded-lg border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 overflow-hidden"
                >
                  {displayThumbnail && (
                    <div className="aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <Image
                        src={displayThumbnail}
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
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
