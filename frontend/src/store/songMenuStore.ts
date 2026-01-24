import { create } from "zustand";

interface SongMenuData {
  id: number;
  title: string;
  artistName: string;
  tjNumber?: string;
}

interface SongMenuState {
  isOpen: boolean;
  song?: SongMenuData;
  openMenu: (song: SongMenuData) => void;
  closeMenu: () => void;
}

export const useSongMenuStore = create<SongMenuState>((set) => ({
  isOpen: false,
  song: undefined,
  openMenu: (song) => set({ isOpen: true, song }),
  closeMenu: () => set({ isOpen: false, song: undefined }),
}));
