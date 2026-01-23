"use client";

import { ArrowLeft, Clock, Flame, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import {
  useSearchControllerGetRecentSearches,
  useSearchControllerGetSearchSuggestions,
} from "@/api/model/search/search";
import { ArtistCard } from "@/components/common/ArtistCard";
import { SongCard } from "@/components/common/SongCard";
import { SearchBar } from "@/components/search/SearchBar";
import { formatSongTitle } from "@/lib/formatSongTitle";
import { hasIncompleteKorean } from "@/lib/korean";
import { useSearchStore } from "@/store/searchStore";

type SuggestionItem = {
  term: string;
  type: "recent" | "popular";
};

export function SearchOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query, setQuery, clearSearch } = useSearchStore();
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

  // 최근/인기 검색어 조회 (검색어가 비어있을 때만)
  const { data: searchSuggestions } = useSearchControllerGetRecentSearches({
    query: { enabled: query.length === 0 },
  });

  // 인기 검색어 + 최근 검색어 (총 8개, 인기 최소 2개~최대 8개)
  const combinedSuggestions = useMemo((): SuggestionItem[] => {
    const recents = searchSuggestions?.data?.recents ?? [];
    const populars = searchSuggestions?.data?.populars ?? [];

    const result: SuggestionItem[] = [];

    // 최근검색어 개수 (최대 5개)
    const recentCount = Math.min(recents.length, 5);
    // 인기검색어 개수 (최소 2개, 8 - 최근개수)
    const popularCount = Math.max(2, 8 - recentCount);

    // 인기 검색어 먼저
    for (const term of populars.slice(0, popularCount)) {
      result.push({ term, type: "popular" });
    }

    // 최근 검색어
    for (const term of recents.slice(0, recentCount)) {
      result.push({ term, type: "recent" });
    }

    return result;
  }, [searchSuggestions]);

  const showSuggestions = query.length === 0 && combinedSuggestions.length > 0;

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
                  {card.suggestion.source === "recent" ? (
                    <Clock className="size-5 text-gray-400" />
                  ) : (
                    <Search className="size-5 text-gray-400" />
                  )}
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
                      router.push(`/artist/${card.artist.slug}`);
                    }
                  }}
                />
              );
            }

            // 곡 카드
            if (card.song) {
              const tjKaraoke = card.song.karaokeSongs?.find(
                (k) => k.provider === "TJ",
              );

              return (
                <SongCard
                  key={`song-${card.song.id}`}
                  thumbnail={card.song.thumbnail}
                  title={formatSongTitle(
                    card.song.title,
                    card.song.titleKo,
                    card.song.titleJa,
                    card.song.titleLatin,
                  )}
                  subtitle={card.song.artistName ?? ""}
                  tjNumber={tjKaraoke?.karaokeNo}
                  onClick={() => {
                    if (card.song?.artistSlug) {
                      router.push(
                        `/artist/${card.song.artistSlug}#${card.song.id}`,
                      );
                    }
                  }}
                />
              );
            }

            return null;
          })}
        {/* 최근/인기 검색어 표시 (검색어가 비어있을 때) */}
        {showSuggestions &&
          combinedSuggestions.map((item) => (
            <button
              key={`suggestion-${item.type}-${item.term}`}
              type="button"
              onClick={() => {
                setQuery(item.term);
                router.push(`/search?q=${encodeURIComponent(item.term)}`);
              }}
              className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left flex items-center gap-3"
            >
              {item.type === "recent" ? (
                <Clock className="size-5 text-gray-400" />
              ) : (
                <Flame className="size-5 text-gray-400" />
              )}
              <span className="text-white flex-1">{item.term}</span>
            </button>
          ))}
        {/* 검색어 비어있고 추천 검색어 없을 때 */}
        {query.length === 0 && !showSuggestions && (
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
