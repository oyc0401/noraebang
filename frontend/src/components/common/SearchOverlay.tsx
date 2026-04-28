"use client";

import { ArrowLeft, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  useSearchControllerGetSearchSuggestions,
} from "@/api/model/search/search";
import { ArtistCard } from "@/components/common/ArtistCard";
import { SearchOverlayLinkPaste } from "@/components/common/SearchOverlayLinkPaste";
import { SearchTermCard } from "@/components/common/SearchTermCard";
import { SongCard } from "@/components/common/SongCard";
import { SearchBar } from "@/components/search/SearchBar";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { formatSongTitle } from "@/lib/formatSongTitle";
import { saveRecentSearch } from "@/lib/recentSearches";
import { hasIncompleteKorean } from "@/lib/korean";
import { useSearchStore } from "@/store/searchStore";

export function SearchOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query, setQuery, clearSearch } = useSearchStore();
  const { recentSearches, deleteRecentSearch } = useRecentSearches();
  const initialPathname = useRef(pathname);
  const initialSearchParams = useRef(searchParams.toString());

  // 라우트 변경 감지하여 오버레이 닫기
  useEffect(() => {
    const currentSearchParams = searchParams.toString();
    if (
      pathname !== initialPathname.current ||
      currentSearchParams !== initialSearchParams.current
    ) {
      clearSearch();
    }
  }, [pathname, searchParams, clearSearch]);

  // 완성형 한글이 아니면 API 호출 안함
  const shouldFetch = query.length > 0 && !hasIncompleteKorean(query);

  const { data: suggestions, isLoading } =
    useSearchControllerGetSearchSuggestions(
      { query },
      { query: { enabled: shouldFetch } },
    );

  const showRecentSearches = query.length === 0 && recentSearches.length > 0;

  return (
    <div className="bg-background-dark flex flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background-dark pl-2 pr-1.5 backdrop-blur-md">
        <button
          type="button"
          onClick={clearSearch}
          className="text-gray-400 hover:text-white transition-colors size-11 flex items-center justify-center"
        >
          <ArrowLeft className="size-6" />
        </button>
        <div className="flex-1">
          <SearchBar />
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full mx-auto overflow-y-auto px-2 py-2">
        {/* 링크 붙여넣기 섹션 (검색어가 비어있을 때) */}
        {query.length === 0 && <SearchOverlayLinkPaste />}
        {suggestions?.data.cards &&
          suggestions.data.cards.length > 0 &&
          suggestions.data.cards.map((card, index) => {
            // 추천 검색어 카드
            if (card.suggestion) {
              return (
                <button
                  key={`suggestion-${card.suggestion.title}-${index}`}
                  type="button"
                  onClick={() => {
                    if (card.suggestion?.title) {
                      router.push(`/search?q=${card.suggestion.title}`);
                    }
                  }}
                  className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left flex items-center gap-3"
                >
                  <span className="text-white">{card.suggestion.title}</span>
                </button>
              );
            }

            // 아티스트 카드
            if (card.artist) {
              return (
                <ArtistCard
                  key={`artist-${card.artist.id}`}
                  thumbnail={card.artist.thumbnail}
                  title={card.artist.titleKo || card.artist.title}
                  subtitle={card.artist.title}
                  onClick={() => {
                    if (card.artist?.slug) {
                      if (query) saveRecentSearch(query);
                      router.push(`/artist/${card.artist.slug}`);
                    }
                  }}
                />
              );
            }

            // 곡 카드
            if (card.song) {
              return (
                <SongCard
                  key={`song-${card.song.id}`}
                  songId={card.song.id}
                  thumbnail={card.song.thumbnail}
                  title={formatSongTitle(
                    card.song.title,
                    card.song.titleKo,
                    card.song.titleJa,
                    card.song.titleLatin,
                  )}
                  subtitle={card.song.artistName ?? ""}
                  tjNumber={card.song.tjSong?.id}
                  bestProposeHit={card.song.bestSongPropose?.hit}
                  onClick={() => {
                    if (card.song) {
                      if (query) saveRecentSearch(query);
                      router.push(`/song/${card.song.id}`);
                    }
                  }}
                />
              );
            }

            return null;
          })}
        {/* 최근 검색어 섹션 (검색어가 비어있을 때) */}
        {showRecentSearches && (
          <>
            <div className="p-2 text-gray-400 text-sm">최근 검색어</div>
            {recentSearches.map((term) => (
              <div key={`recent-${term}`} className="flex items-center">
                <div className="flex-1">
                  <SearchTermCard
                    term={term}
                    onClick={() => {
                      setQuery(term);
                      router.push(`/search?q=${encodeURIComponent(term)}`);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => deleteRecentSearch(term)}
                  className="p-2 text-gray-500 hover:text-gray-300 cursor-pointer transition-colors shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </>
        )}
        {/* 검색어 비어있고 최근 검색어 없을 때 */}
        {query.length === 0 && !showRecentSearches && (
          <div className="text-center text-gray-400 py-8">
            검색어를 입력해주세요
          </div>
        )}
        {/* 검색 결과가 없을 때 (검색어가 있는 경우) */}
        {!isLoading &&
          query.length > 0 &&
          (!suggestions?.data.cards || suggestions.data.cards.length === 0) && (
            <div className="text-center text-gray-400 py-8">
              검색 결과가 없습니다
            </div>
          )}
      </main>
    </div>
  );
}
