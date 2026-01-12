import { create } from "zustand";

type ManagerStoreState = {
  selectedArtistId: number | null;
  setSelectedArtistId: (artistId: number | null) => void;
};

export const useManagerStore = create<ManagerStoreState>((set) => ({
  selectedArtistId: null,
  setSelectedArtistId: (selectedArtistId) => set({ selectedArtistId }),
}));
