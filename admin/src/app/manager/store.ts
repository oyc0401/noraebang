import { create } from "zustand";
import type { ManagerSpotifyTrackSummary } from "./types";

type ManagerStoreState = {
  selectedArtistId: number | null;
  setSelectedArtistId: (artistId: number | null) => void;
  selectedGroupId: number | null;
  setSelectedGroupId: (groupId: number | null) => void;
  isArtistNameDialogOpen: boolean;
  openArtistNameDialog: () => void;
  closeArtistNameDialog: () => void;
  isSpotifyIdDialogOpen: boolean;
  openSpotifyIdDialog: () => void;
  closeSpotifyIdDialog: () => void;
  isDeleteArtistDialogOpen: boolean;
  openDeleteArtistDialog: () => void;
  closeDeleteArtistDialog: () => void;
  isMergeArtistDialogOpen: boolean;
  openMergeArtistDialog: () => void;
  closeMergeArtistDialog: () => void;
  isYoutubeDialogOpen: boolean;
  openYoutubeDialog: () => void;
  closeYoutubeDialog: () => void;
  isCreateArtistDialogOpen: boolean;
  openCreateArtistDialog: () => void;
  closeCreateArtistDialog: () => void;
  groupDetail: { groupId: number; tracks: ManagerSpotifyTrackSummary[] } | null;
  openGroupDetail: (
    groupId: number,
    tracks: ManagerSpotifyTrackSummary[],
  ) => void;
  closeGroupDetail: () => void;
};

export const useManagerStore = create<ManagerStoreState>((set) => ({
  selectedArtistId: null,
  setSelectedArtistId: (selectedArtistId) => set({ selectedArtistId }),
  selectedGroupId: null,
  setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId }),
  isArtistNameDialogOpen: false,
  openArtistNameDialog: () => set({ isArtistNameDialogOpen: true }),
  closeArtistNameDialog: () => set({ isArtistNameDialogOpen: false }),
  isSpotifyIdDialogOpen: false,
  openSpotifyIdDialog: () => set({ isSpotifyIdDialogOpen: true }),
  closeSpotifyIdDialog: () => set({ isSpotifyIdDialogOpen: false }),
  isDeleteArtistDialogOpen: false,
  openDeleteArtistDialog: () => set({ isDeleteArtistDialogOpen: true }),
  closeDeleteArtistDialog: () => set({ isDeleteArtistDialogOpen: false }),
  isMergeArtistDialogOpen: false,
  openMergeArtistDialog: () => set({ isMergeArtistDialogOpen: true }),
  closeMergeArtistDialog: () => set({ isMergeArtistDialogOpen: false }),
  isYoutubeDialogOpen: false,
  openYoutubeDialog: () => set({ isYoutubeDialogOpen: true }),
  closeYoutubeDialog: () => set({ isYoutubeDialogOpen: false }),
  isCreateArtistDialogOpen: false,
  openCreateArtistDialog: () => set({ isCreateArtistDialogOpen: true }),
  closeCreateArtistDialog: () => set({ isCreateArtistDialogOpen: false }),
  groupDetail: null,
  openGroupDetail: (groupId, tracks) => set({ groupDetail: { groupId, tracks } }),
  closeGroupDetail: () => set({ groupDetail: null }),
}));
