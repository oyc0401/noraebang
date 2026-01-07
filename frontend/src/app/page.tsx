"use client";

import { useSearchStore } from "@/store/searchStore";
import { Home } from "@/components/home/Home";
import { SearchOverlay } from "@/components/home/SearchOverlay";

export default function HomePage() {
  const { query } = useSearchStore();

  return query ? <SearchOverlay /> : <Home />;
}
