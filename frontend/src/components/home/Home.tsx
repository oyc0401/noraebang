"use client";

import { Header } from "@/components/common/Header";
import { LinkPasteCard } from "@/components/home/LinkPasteCard";
import { PopularSongs } from "@/components/home/PopularSongs";
import { RecentlyPlayed } from "@/components/home/RecentlyPlayed";
import { RecentlyReleased } from "@/components/home/RecentlyReleased";
import { SearchBar } from "@/components/home/SearchBar";

export function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col w-full mx-auto overflow-x-hidden">
        <div className="px-4 pt-4 pb-4">
          <h1 className="text-white text-[32px] font-bold leading-tight">
            어떤 노래를
            <br />
            <span className="text-primary">부르시겠어요?</span>
          </h1>
        </div>
        <div className="px-5 py-2">
          <SearchBar />
        </div>
        <div className="px-5 pt-4 pb-6">
          <LinkPasteCard />
        </div>
        <div className="w-full mb-6">
          <RecentlyPlayed />
        </div>
        <div className="w-full px-5 mb-2">
          <RecentlyReleased />
        </div>
        <div className="w-full px-5 py-4 mb-8">
          <PopularSongs />
        </div>
      </main>
    </>
  );
}
