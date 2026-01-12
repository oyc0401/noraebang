import { create } from "zustand";

type ManagerStoreState = {
  selectedArtistId: number | null;
  setSelectedArtistId: (artistId: number | null) => void;
  isArtistNameDialogOpen: boolean;
  openArtistNameDialog: () => void;
  closeArtistNameDialog: () => void;
  isSpotifyIdDialogOpen: boolean;
  openSpotifyIdDialog: () => void;
  closeSpotifyIdDialog: () => void;
  isCatalogDialogOpen: boolean;
  openCatalogDialog: () => void;
  closeCatalogDialog: () => void;
  isDeleteArtistDialogOpen: boolean;
  openDeleteArtistDialog: () => void;
  closeDeleteArtistDialog: () => void;
  isMergeArtistDialogOpen: boolean;
  openMergeArtistDialog: () => void;
  closeMergeArtistDialog: () => void;
};

export const useManagerStore = create<ManagerStoreState>((set) => ({
  selectedArtistId: null,
  setSelectedArtistId: (selectedArtistId) => set({ selectedArtistId }),
  isArtistNameDialogOpen: false,
  openArtistNameDialog: () => set({ isArtistNameDialogOpen: true }),
  closeArtistNameDialog: () => set({ isArtistNameDialogOpen: false }),
  isSpotifyIdDialogOpen: false,
  openSpotifyIdDialog: () => set({ isSpotifyIdDialogOpen: true }),
  closeSpotifyIdDialog: () => set({ isSpotifyIdDialogOpen: false }),
  isCatalogDialogOpen: false,
  openCatalogDialog: () => set({ isCatalogDialogOpen: true }),
  closeCatalogDialog: () => set({ isCatalogDialogOpen: false }),
  isDeleteArtistDialogOpen: false,
  openDeleteArtistDialog: () => set({ isDeleteArtistDialogOpen: true }),
  closeDeleteArtistDialog: () => set({ isDeleteArtistDialogOpen: false }),
  isMergeArtistDialogOpen: false,
  openMergeArtistDialog: () => set({ isMergeArtistDialogOpen: true }),
  closeMergeArtistDialog: () => set({ isMergeArtistDialogOpen: false }),
}));
