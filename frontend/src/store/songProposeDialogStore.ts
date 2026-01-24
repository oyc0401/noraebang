import { create } from "zustand";

interface SongProposeDialogData {
  songTitle: string;
  artistName: string;
}

interface SongProposeDialogState {
  isOpen: boolean;
  data?: SongProposeDialogData;
  openDialog: (data: SongProposeDialogData) => void;
  closeDialog: () => void;
}

export const useSongProposeDialogStore = create<SongProposeDialogState>(
  (set) => ({
    isOpen: false,
    data: undefined,
    openDialog: (data) => set({ isOpen: true, data }),
    closeDialog: () => set({ isOpen: false, data: undefined }),
  }),
);
