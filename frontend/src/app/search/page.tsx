"use client";

import { useSearchStore } from "@/store/searchStore";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { Suspense } from "react";
import { SearchPageContent } from "./SearchPageContent";

export default function SearchPage() {
  const { isSearchActive } = useSearchStore();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {isSearchActive ? <SearchOverlay /> : <SearchPageContent />}
    </Suspense>
  );
}
