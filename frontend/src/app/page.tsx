"use client";

import { SearchOverlay } from "@/components/common/SearchOverlay";
import { Home } from "@/app/Home";
import { useSearchStore } from "@/store/searchStore";

export default function HomePage() {
  const { isSearchActive } = useSearchStore();

  return isSearchActive ? <SearchOverlay /> : <Home />;
}
