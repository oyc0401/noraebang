"use client";

import Link from "next/link";

import {
  ManagerArtistsProvider,
  useManagerArtists,
} from "./artist-list-context";
import { CenterSection } from "./components/center-section";
import { LeftPanel } from "./components/left-panel";
import { RightSection } from "./components/right-section";

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
    <div className="min-h-screen bg-zinc-50  text-zinc-900 h-[100vh]">
      <div className="mx-auto flex h-full min-h-0 flex-col">
        <header className="flex flex-col px-4 py-4">
          <div className="flex flex-row justify-between md:items-end">
            <div className="  flex flex-row">
              <h1 className=" text-3xl font-bold">아티스트 관리자</h1>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-blue-400 hover:text-blue-600 cursor-pointer"
              >
                대시보드 바로가기
              </Link>
            </div>

            <div className="text-sm text-zinc-500">
              총 {totalArtistCount.toLocaleString()}명의 아티스트
            </div>
          </div>
          <div className="flex flex-wrap gap-3"></div>
        </header>

        <div className="grid flex-1 min-h-0 gap-0 lg:[grid-template-columns:350px_minmax(0,1fr)_420px]">
          <LeftPanel />
          {/* <CenterSection /> */}

          {/* <RightSection /> */}
        </div>
      </div>
    </div>
  );
}
