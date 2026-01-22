"use client";

import { ArrowLeft, Clock, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSearchControllerGetSearchSuggestions } from "@/api/model/search/search";
import { ArtistCard } from "@/components/common/ArtistCard";
import { SongCard } from "@/components/common/SongCard";
import { SearchBar } from "@/components/search/SearchBar";
import { formatSongTitle } from "@/lib/formatSongTitle";
import { hasIncompleteKorean } from "@/lib/korean";
import { useSearchStore } from "@/store/searchStore";

export function SearchOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query, clearSearch } = useSearchStore();
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
        {!isLoading &&
          (!suggestions?.data.cards || suggestions.data.cards.length === 0) && (
            <div className="text-center text-gray-400 py-8">
              검색어를 입력해주세요
            </div>
          )}
      </main>
    </div>
  );
}
