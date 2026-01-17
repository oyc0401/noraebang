import { create } from "zustand";
import type { ManagerSpotifyTrackSummary } from "./types";

export type RightSectionType = "spotify" | "youtube" | "tj";

type ManagerStoreState = {
  selectedArtistId: number | null;
  setSelectedArtistId: (artistId: number | null) => void;
  selectedGroupId: number | null;
  setSelectedGroupId: (groupId: number | null) => void;
  rightSectionType: RightSectionType;
  setRightSectionType: (type: RightSectionType) => void;
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
  isAliasDialogOpen: boolean;
  openAliasDialog: () => void;
  closeAliasDialog: () => void;
  groupDetail: { groupId: number; tracks: ManagerSpotifyTrackSummary[] } | null;
  openGroupDetail: (
    groupId: number,
    tracks: ManagerSpotifyTrackSummary[],
  ) => void;
  closeGroupDetail: () => void;
  // 곡 생성 다이얼로그
  songCreateDialogOpen: boolean;
  songCreateInitialTitle: string;
  songCreateInitialSpotifyGroupId: number | null;
  openSongCreateDialog: (initialTitle?: string, spotifyGroupId?: number) => void;
  closeSongCreateDialog: () => void;
};

export const useManagerStore = create<ManagerStoreState>((set) => ({
  selectedArtistId: null,
  setSelectedArtistId: (selectedArtistId) => set({ selectedArtistId }),
  selectedGroupId: null,
  setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId }),
  rightSectionType: "spotify",
  setRightSectionType: (rightSectionType) => set({ rightSectionType }),
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
  isAliasDialogOpen: false,
  openAliasDialog: () => set({ isAliasDialogOpen: true }),
  closeAliasDialog: () => set({ isAliasDialogOpen: false }),
  groupDetail: null,
  openGroupDetail: (groupId, tracks) => set({ groupDetail: { groupId, tracks } }),
  closeGroupDetail: () => set({ groupDetail: null }),
  // 곡 생성 다이얼로그
  songCreateDialogOpen: false,
  songCreateInitialTitle: "",
  songCreateInitialSpotifyGroupId: null,
  openSongCreateDialog: (initialTitle, spotifyGroupId) =>
    set({
      songCreateDialogOpen: true,
      songCreateInitialTitle: initialTitle ?? "",
      songCreateInitialSpotifyGroupId: spotifyGroupId ?? null,
    }),
  closeSongCreateDialog: () =>
    set({
      songCreateDialogOpen: false,
      songCreateInitialTitle: "",
      songCreateInitialSpotifyGroupId: null,
    }),
}));
