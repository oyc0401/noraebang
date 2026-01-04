"use client";

import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { ArtistList } from "@/components/artist/ArtistList";
import { useSearchStore } from "@/store/searchStore";

export default function HomePage() {
  const { results } = useSearchStore();
  const hasSearchResults = results.length > 0;

  return (
    <div className="min-h-screen bg-black">
      {/* YouTube Music 스타일 큰 헤더 */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-lg border-b border-zinc-800 px-4 py-8">
        <h1 className="text-5xl font-bold text-white mb-6">노래방 검색</h1>
        <SearchBar />
      </header>

      {/* 검색 결과 또는 아티스트 목록 */}
      <main className="px-4 py-8">
        {hasSearchResults ? (
          <SearchResults />
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-white mb-6">
              아티스트
            </h2>
            <ArtistList />
          </>
        )}
      </main>
    </div>
  );
}
