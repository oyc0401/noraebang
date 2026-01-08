"use client";

import { useSearchStore } from "@/store/searchStore";
import { Home } from "@/components/home/Home";
import { SearchOverlay } from "@/components/search/SearchOverlay";

export default function HomePage() {
  const { isSearchActive } = useSearchStore();

  return isSearchActive ? <SearchOverlay /> : <Home />;
}
