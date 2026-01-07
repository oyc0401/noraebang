"use client";

import { useSearchStore } from "@/store/searchStore";
import { Home } from "@/components/home/Home";
import { HomeSearch } from "@/components/home/HomeSearch";

export default function HomePage() {
  const { query } = useSearchStore();

  return (
    <div className="bg-background-dark font-display min-h-screen flex flex-col antialiased">
      {query ? <HomeSearch /> : <Home />}
    </div>
  );
}
