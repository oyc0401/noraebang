"use client";

import { useRouter } from "next/navigation";
import { useSearchStore } from "@/store/searchStore";
import { SearchBar } from "@/components/home/SearchBar";
import { useSearchControllerGetSearchSuggestions } from "@/api/model/search/search";

export function SearchOverlay() {
  const router = useRouter();
  const { query, clearSearch } = useSearchStore();

  const { data: suggestions, isLoading } = useSearchControllerGetSearchSuggestions(
    { query },
    { query: { enabled: query.length > 0 } }
  );

  const handleSelect = (item: typeof suggestions.data[0]) => {
    if (item.type === "artist" && item.artist?.slug) {
      router.push(`/channel/${item.artist.slug}`);
      clearSearch();
    } else if (item.type === "song" && item.song) {
      const slug = item.song.artists[0]?.slug;
      if (slug) {
        router.push(`/channel/${slug}#${item.song.id}`);
        clearSearch();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <header className="flex items-center gap-2 p-4 pt-12 pb-4 sticky top-0 z-20 bg-background-dark backdrop-blur-md transition-colors">
        <button
          onClick={clearSearch}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 max-w-md">
          <SearchBar />
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto overflow-y-auto px-5 py-4">
        {isLoading && (
          <div className="text-center text-gray-400 py-8">검색 중...</div>
        )}
        {suggestions?.data && suggestions.data.length > 0 && (
          <div className="space-y-2">
            {suggestions.data.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSelect(item)}
                className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left"
              >
                {item.type === "artist" && item.artist && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">
                      아티스트
                    </div>
                    <div className="font-semibold text-white">
                      {item.artist.nameKo}
                    </div>
                    <div className="text-sm text-gray-400">
                      {item.artist.name}
                    </div>
                  </div>
                )}
                {item.type === "song" && item.song && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">
                      곡
                    </div>
                    <div className="font-semibold text-white">
                      {item.song.titleKo || item.song.title}
                    </div>
                    <div className="text-sm text-gray-400">
                      {item.song.artists.map((a) => a.nameKo).join(", ")}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        {!isLoading &&
          query &&
          (!suggestions?.data || suggestions.data.length === 0) && (
            <div className="text-center text-gray-400 py-8">
              검색 결과가 없습니다
            </div>
          )}
      </main>
    </div>
  );
}
