"use client";

import { Clock, Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSearchControllerGetSearchSuggestions } from "@/api/model/search/search";
import { KaraokeBadge } from "@/components/common/KaraokeBadge";
import { SearchBar } from "@/components/search/SearchBar";
import { hasIncompleteKorean } from "@/lib/korean";
import { useSearchStore } from "@/store/searchStore";

export function SearchOverlay() {
  const router = useRouter();
  const { query, setQuery, clearSearch } = useSearchStore();

  // 완성형 한글이 아니면 API 호출 안함
  const shouldFetch = query.length > 0 && !hasIncompleteKorean(query);

  const { data: suggestions, isLoading } =
    useSearchControllerGetSearchSuggestions(
      { query },
      { query: { enabled: shouldFetch } },
    );

  return (
    <div className="bg-background-dark flex flex-col">
      <header className="sticky top-0 z-20 flex items-center pl-4 pr-2 gap-2 bg-background-dark backdrop-blur-md py-4">
        <div className="flex-1">
          <SearchBar />
        </div>
        <button
          type="button"
          onClick={clearSearch}
          className="text-gray-400 hover:text-white transition-colors size-11 flex items-center justify-center text-sm"
        >
          취소
        </button>
      </header>
      <main className="flex-1 flex flex-col w-full mx-auto overflow-y-auto px-4 py-4">
        {suggestions?.data.cards && suggestions.data.cards.length > 0 && (
          <div className="space-y-2">
            {suggestions.data.cards.map((card, index) => {
              // 추천 검색어 카드
              if (card.suggestion) {
                return (
                  <button
                    key={`suggestion-${card.suggestion.title}-${index}`}
                    type="button"
                    onClick={() => {
                      if (card.suggestion?.title) {
                        router.push(`/search?q=${card.suggestion.title}`);
                        clearSearch();
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
                  <button
                    key={`artist-${card.artist.id}`}
                    type="button"
                    onClick={() => {
                      if (card.artist?.slug) {
                        router.push(`/artist/${card.artist.slug}`);
                        clearSearch();
                      }
                    }}
                    className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left flex items-center gap-4"
                  >
                    {card.artist.thumbnail && (
                      <Image
                        src={card.artist.thumbnail}
                        alt={card.artist.title}
                        width={48}
                        height={48}
                        className="rounded-full shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400 mb-1">아티스트</div>
                      <div className="font-semibold text-white truncate">
                        {card.artist.titleKo || card.artist.title}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {card.artist.title}
                      </div>
                    </div>
                  </button>
                );
              }

              // 곡 카드
              if (card.song) {
                return (
                  <button
                    key={`song-${card.song.id}`}
                    type="button"
                    onClick={() => {
                      if (card.song?.artistSlug) {
                        router.push(
                          `/artist/${card.song.artistSlug}#${card.song.id}`,
                        );
                        clearSearch();
                      }
                    }}
                    className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left flex items-center gap-4"
                  >
                    {card.song.thumbnail && (
                      <Image
                        src={card.song.thumbnail}
                        alt={card.song.title}
                        width={48}
                        height={48}
                        className="rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400 mb-1">곡</div>
                      <div className="font-semibold text-white truncate">
                        {card.song.titleKo || card.song.title}
                      </div>
                      <div className="text-sm text-gray-400 truncate mb-1">
                        {card.song.artistName}
                      </div>
                      {card.song.karaokeSongs &&
                        card.song.karaokeSongs.length > 0 &&
                        (card.song.karaokeSongs[0].provider === "TJ" ||
                          card.song.karaokeSongs[0].provider === "KY") && (
                          <KaraokeBadge
                            provider={card.song.karaokeSongs[0].provider}
                            number={card.song.karaokeSongs[0].karaokeNo}
                          />
                        )}
                    </div>
                  </button>
                );
              }

              return null;
            })}
          </div>
        )}
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
