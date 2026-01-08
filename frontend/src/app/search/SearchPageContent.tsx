"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSearchControllerSearch } from "@/api/model/search/search";
import { useSearchStore } from "@/store/searchStore";
import Image from "next/image";
import { KaraokeBadge } from "@/components/common/KaraokeBadge";

import { SearchIcon } from "lucide-react";
import { useEffect } from "react";

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const { setSearchActive, setQuery, clearSearch } = useSearchStore();

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery, setQuery]);

  const { data: results, isLoading } = useSearchControllerSearch(
    { query: urlQuery },
    { query: { enabled: !!urlQuery } },
  );

  return (
    <div className="bg-background-dark flex flex-col">
      <header className="flex items-center gap-2 p-4 sticky top-0 bg-background-dark backdrop-blur-md z-10">
        <button
          type="button"
          onClick={() => setSearchActive(true)}
          className="flex w-full items-center rounded-lg h-14 bg-surface-dark shadow-sm ring-1 ring-surface-border overflow-hidden transition-all hover:ring-2 hover:ring-primary cursor-pointer"
        >
          <div className="flex items-center justify-center pl-4 text-[#6B7280]">
            <SearchIcon className="size-6" />
          </div>
          <div className="flex-1 text-left px-3 text-[#6B7280] text-base">
            제목, 가수, 번호 검색...
          </div>
        </button>
      </header>
      <main className="flex-1 flex flex-col w-full mx-auto overflow-y-auto px-5 py-4">
        {isLoading && (
          <div className="text-center text-gray-400 py-8">검색 중...</div>
        )}
        {results?.data.artists && results.data.artists.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">아티스트</h2>
            <div className="space-y-2">
              {results.data.artists.map((artist) => (
                <button
                  key={`artist-${artist.id}`}
                  type="button"
                  onClick={() => {
                    if (artist?.slug) {
                      router.push(`/artist/${artist.slug}`);
                      clearSearch();
                    }
                  }}
                  className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left flex items-center gap-4"
                >
                  {artist.thumbnail && (
                    <Image
                      src={artist.thumbnail}
                      alt={artist.title}
                      width={48}
                      height={48}
                      className="rounded-full shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {artist.titleKo || artist.title}
                    </div>
                    <div className="text-sm text-gray-400 truncate">
                      {artist.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {results?.data.songs && results.data.songs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">곡</h2>
            <div className="space-y-2">
              {results.data.songs.map((song) => (
                <button
                  key={`song-${song.id}`}
                  type="button"
                  onClick={() => {
                    if (song?.artistSlug) {
                      router.push(`/artist/${song.artistSlug}#${song.id}`);
                      clearSearch();
                    }
                  }}
                  className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left flex items-center gap-4"
                >
                  {song.thumbnail && (
                    <Image
                      src={song.thumbnail}
                      alt={song.title}
                      width={48}
                      height={48}
                      className="rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {song.titleKo || song.title}
                    </div>
                    <div className="text-sm text-gray-400 truncate mb-1">
                      {song.artistName}
                    </div>
                    {song.karaokeSongs &&
                      song.karaokeSongs.length > 0 &&
                      (song.karaokeSongs[0].provider === "TJ" ||
                        song.karaokeSongs[0].provider === "KY") && (
                        <KaraokeBadge
                          provider={song.karaokeSongs[0].provider}
                          number={song.karaokeSongs[0].karaokeNo}
                        />
                      )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {!isLoading &&
          (!results?.data.artists || results.data.artists.length === 0) &&
          (!results?.data.songs || results.data.songs.length === 0) && (
            <div className="text-center text-gray-400 py-8">
              검색 결과가 없습니다.
            </div>
          )}
      </main>
    </div>
  );
}
