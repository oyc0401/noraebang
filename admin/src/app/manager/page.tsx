"use client";

import Link from "next/link";

import {
  ManagerArtistsProvider,
  useManagerArtists,
} from "./artist-list-context";
import { CenterSection } from "./components/center-section";
import { LeftPanel } from "./components/left-panel";
import { RightSectionPlaceholder } from "./components/right-section";

export default function ManagerPage() {
  return (
    <ManagerArtistsProvider>
      <ManagerPageInner />
    </ManagerArtistsProvider>
  );
}

function ManagerPageInner() {
  const { totalArtistCount } = useManagerArtists();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-4 text-zinc-900">
      <div className="mx-auto flex flex-col gap-6 lg:gap-8">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold">아티스트 관리자</h1>
            </div>
            <div className="text-sm text-zinc-500">
              총 {totalArtistCount.toLocaleString()}명의 아티스트
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 cursor-pointer"
            >
              대시보드 바로가기
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:[grid-template-columns:420px_minmax(0,1fr)_320px] h-full">
          <LeftPanel />
          <CenterSection />

          <RightSectionPlaceholder />
        </div>
      </div>
    </div>
  );
}
