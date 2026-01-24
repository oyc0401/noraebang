import { create } from "zustand";

interface ReportDialogData {
  songId: number;
  songTitle: string;
  artistName: string;
  artistId?: number;
}

interface ReportDialogState {
  isOpen: boolean;
  data?: ReportDialogData;
  openDialog: (data: ReportDialogData) => void;
  closeDialog: () => void;
}

export const useReportDialogStore = create<ReportDialogState>((set) => ({
  isOpen: false,
  data: undefined,
  openDialog: (data) => set({ isOpen: true, data }),
  closeDialog: () => set({ isOpen: false, data: undefined }),
}));
