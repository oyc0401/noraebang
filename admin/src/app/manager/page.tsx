"use client";

import Link from "next/link";

import {
  ManagerArtistsProvider,
  useManagerArtists,
} from "./artist-list-context";
import { CenterSection } from "./components/center-section";
import { LeftPanel } from "./components/left-panel";
import { RightSection } from "./components/right-section";
import { ArtistCreateDialog } from "./components/dialog/artist-create-dialog";
import { GroupDetailDialog } from "./components/dialog/group-detail-dialog";

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
    <>
      <div className="min-h-screen bg-zinc-50  text-zinc-900 h-[100vh]">
        <div className="mx-auto flex h-full min-h-0 flex-col">
          <div className="grid flex-1 min-h-0 gap-0 [grid-template-columns:350px_minmax(0,1fr)_420px]">
            <LeftPanel />
            <CenterSection />

            <RightSection />
          </div>
        </div>
      </div>
      <ArtistCreateDialog />
      <GroupDetailDialog />
    </>
  );
}
