"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ManagerSpotifyTrackSummary } from "../types";

export type SpotifyDialogContextValue = {
  selectedArtistId: number | null;
  orphanTracks: ManagerSpotifyTrackSummary[];
  editingGroupId: number | null;
  isGroupEditDialogOpen: boolean;
  openGroupEditDialog: (groupId: number) => void;
  closeGroupEditDialog: () => void;
  isNewGroupDialogOpen: boolean;
  openNewGroupDialog: () => void;
  closeNewGroupDialog: () => void;
  refetch: () => void;
};

const SpotifyDialogContext =
  createContext<SpotifyDialogContextValue | null>(null);

export function SpotifyDialogProvider({
  value,
  children,
}: {
  value: SpotifyDialogContextValue;
  children: ReactNode;
}) {
  return (
    <SpotifyDialogContext.Provider value={value}>
      {children}
    </SpotifyDialogContext.Provider>
  );
}

export function useSpotifyDialogContext() {
  const context = useContext(SpotifyDialogContext);
  if (!context) {
    throw new Error(
      "useSpotifyDialogContext는 SpotifyDialogProvider 내부에서만 사용할 수 있습니다.",
    );
  }
  return context;
}
