"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSearchControllerSearch } from "@/api/model/search/search";
import Image from "next/image";
import { KaraokeBadge } from "@/components/common/KaraokeBadge";
import { Header } from "@/components/common/Header";
import { SearchTrigger } from "@/components/common/SearchTrigger";
import { useSearchStore } from "@/store/searchStore";

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { setSearchActive, setQuery, clearSearch } = useSearchStore();

  const { data: results, isLoading } = useSearchControllerSearch(
    { query },
    { query: { enabled: !!query } },
  );

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="bg-background-dark flex flex-col min-h-screen">
      <Header />

      <section className="px-5 py-4 border-b border-white/5 bg-background-dark sticky top-14 z-10">
        <SearchTrigger
          onClick={() => setSearchActive(true)}
          value={hasQuery ? query : ""}
        />
      </section>

      <main className="flex-1 flex flex-col w-full mx-auto overflow-y-auto px-5 py-4 gap-6">
        {!hasQuery && (
          <div className="text-center text-gray-400 py-16">
            검색어를 입력해 주세요.
          </div>
        )}
        {hasQuery && isLoading && (
          <div className="text-center text-gray-400 py-8">검색 중...</div>
        )}
        {hasQuery &&
          results?.data.artists &&
          results.data.artists.length > 0 && (
            <div>
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
        {hasQuery && results?.data.songs && results.data.songs.length > 0 && (
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
        {hasQuery &&
          !isLoading &&
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
