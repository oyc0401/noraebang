"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ManagerArtistSongDetail } from "../types";

export type SongEditTab =
  | "info"
  | "artists"
  | "spotify"
  | "youtube"
  | "propose"
  | "admin";

export type SongDialogContextValue = {
  artistId: number | null;
  artistInfo: {
    name: string;
    nameKo: string;
    catalog?: string | null;
  } | null;
  songEditState: {
    open: boolean;
    song: ManagerArtistSongDetail | null;
    initialTab: SongEditTab;
  };
  openSongEditDialog: (
    song: ManagerArtistSongDetail,
    options?: { focusTab?: SongEditTab },
  ) => void;
  closeSongEditDialog: () => void;
  addSong: (song: ManagerArtistSongDetail) => void;
  updateSong: (song: ManagerArtistSongDetail) => void;
  removeSong: (songId: number) => void;
};

const SongDialogContext = createContext<SongDialogContextValue | null>(null);

export function SongDialogProvider({
  value,
  children,
}: {
  value: SongDialogContextValue;
  children: ReactNode;
}) {
  return (
    <SongDialogContext.Provider value={value}>
      {children}
    </SongDialogContext.Provider>
  );
}

export function useSongDialogContext() {
  const context = useContext(SongDialogContext);
  if (!context) {
    throw new Error(
      "useSongDialogContext는 SongDialogProvider 내부에서만 사용할 수 있습니다.",
    );
  }
  return context;
}
