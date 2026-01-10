"use client";

import { Suspense } from "react";
import { SearchOverlay } from "@/components/common/SearchOverlay";
import { useSearchStore } from "@/store/searchStore";
import { SearchPageContent } from "./SearchPageContent";

export default function SearchPage() {
  const { isSearchActive } = useSearchStore();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {isSearchActive ? <SearchOverlay /> : <SearchPageContent />}
    </Suspense>
  );
}
