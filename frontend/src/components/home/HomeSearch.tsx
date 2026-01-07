"use client";

import { SearchResults } from "@/components/search/SearchResults";
import { SearchBar } from "@/components/home/SearchBar";

export function HomeSearch() {
  return (
    <>
      <header className="flex items-center justify-center p-4 pt-12 pb-4 sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md transition-colors">
        <div className="w-full max-w-md">
          <SearchBar />
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto overflow-x-hidden px-5 py-4">
        <SearchResults />
      </main>
    </>
  );
}
