"use client";

import { Header } from "@/components/common/Header";
import { HomeSearchBar } from "@/app/HomeSearchBar";
import { LinkPasteCard } from "@/app/LinkPasteCard";
import { RecentSongsSection } from "@/app/RecentSongsSection";

export function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col w-full overflow-x-hidden">
        <div className="px-4 pt-4 pb-4">
          <h1 className="text-white text-[32px] font-bold leading-tight">
            어떤 노래를
            <br />
            <span className="text-primary">부르시겠어요?</span>
          </h1>
        </div>
        <div className="px-4 py-2">
          <HomeSearchBar />
        </div>
        <div className="px-4 py-4">
          <LinkPasteCard />
        </div>
        <RecentSongsSection />
      </main>
    </>
  );
}
