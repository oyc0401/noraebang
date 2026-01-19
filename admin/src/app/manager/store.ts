import { create } from "zustand";
import type { ManagerSpotifyTrackSummary } from "./types";

export type RightSectionType = "spotify" | "youtube" | "tj";

type ManagerStoreState = {
  selectedArtistId: number | null;
  setSelectedArtistId: (artistId: number | null) => void;
  // 선택된 Song ID (해당 Song에 연결된 Spotify 트랙들을 보여줌)
  selectedSongId: number | null;
  setSelectedSongId: (songId: number | null) => void;
  rightSectionType: RightSectionType;
  setRightSectionType: (type: RightSectionType) => void;
  isArtistNameDialogOpen: boolean;
  openArtistNameDialog: () => void;
  closeArtistNameDialog: () => void;
  isSpotifyIdDialogOpen: boolean;
  openSpotifyIdDialog: () => void;
  closeSpotifyIdDialog: () => void;
  isFilterDialogOpen: boolean;
  openFilterDialog: () => void;
  closeFilterDialog: () => void;
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
  // Song에 연결된 Spotify 트랙 상세 보기
  songSpotifyDetail: { songId: number; tracks: ManagerSpotifyTrackSummary[] } | null;
  openSongSpotifyDetail: (
    songId: number,
    tracks: ManagerSpotifyTrackSummary[],
  ) => void;
  closeSongSpotifyDetail: () => void;
  // 곡 생성 다이얼로그
  songCreateDialogOpen: boolean;
  songCreateInitialTitle: string;
  songCreateInitialTrackId: number | null;
  openSongCreateDialog: (initialTitle?: string, trackId?: number) => void;
  closeSongCreateDialog: () => void;
};

export const useManagerStore = create<ManagerStoreState>((set) => ({
  selectedArtistId: null,
  setSelectedArtistId: (selectedArtistId) => set({ selectedArtistId }),
  selectedSongId: null,
  setSelectedSongId: (selectedSongId) => set({ selectedSongId }),
  rightSectionType: "spotify",
  setRightSectionType: (rightSectionType) => set({ rightSectionType }),
  isArtistNameDialogOpen: false,
  openArtistNameDialog: () => set({ isArtistNameDialogOpen: true }),
  closeArtistNameDialog: () => set({ isArtistNameDialogOpen: false }),
  isSpotifyIdDialogOpen: false,
  openSpotifyIdDialog: () => set({ isSpotifyIdDialogOpen: true }),
  closeSpotifyIdDialog: () => set({ isSpotifyIdDialogOpen: false }),
  isFilterDialogOpen: false,
  openFilterDialog: () => set({ isFilterDialogOpen: true }),
  closeFilterDialog: () => set({ isFilterDialogOpen: false }),
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
  songSpotifyDetail: null,
  openSongSpotifyDetail: (songId, tracks) => set({ songSpotifyDetail: { songId, tracks } }),
  closeSongSpotifyDetail: () => set({ songSpotifyDetail: null }),
  // 곡 생성 다이얼로그
  songCreateDialogOpen: false,
  songCreateInitialTitle: "",
  songCreateInitialTrackId: null,
  openSongCreateDialog: (initialTitle, trackId) =>
    set({
      songCreateDialogOpen: true,
      songCreateInitialTitle: initialTitle ?? "",
      songCreateInitialTrackId: trackId ?? null,
    }),
  closeSongCreateDialog: () =>
    set({
      songCreateDialogOpen: false,
      songCreateInitialTitle: "",
      songCreateInitialTrackId: null,
    }),
}));
