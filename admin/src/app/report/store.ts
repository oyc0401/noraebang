import { create } from "zustand";
import type { ReportFilter, ReportStatus } from "./types";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

type ReportStoreState = {
  selectedReportId: number | null;
  setSelectedReportId: (id: number | null) => void;

  filter: ReportFilter;
  setStatusFilter: (status: ReportStatus | "ALL") => void;

  // 날짜 네비게이션
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  toggleAllDates: () => void;
  setDate: (date: string | null) => void;
};

export const useReportStore = create<ReportStoreState>((set) => ({
  selectedReportId: null,
  setSelectedReportId: (selectedReportId) => set({ selectedReportId }),

  filter: {
    status: "ALL",
    date: formatDate(new Date()), // 기본값: 오늘
  },

  setStatusFilter: (status) =>
    set((state) => ({
      filter: { ...state.filter, status },
    })),

  goToPreviousDay: () =>
    set((state) => {
      const currentDate = state.filter.date ?? formatDate(new Date());
      return {
        filter: { ...state.filter, date: addDays(currentDate, -1) },
      };
    }),

  goToNextDay: () =>
    set((state) => {
      const currentDate = state.filter.date ?? formatDate(new Date());
      return {
        filter: { ...state.filter, date: addDays(currentDate, 1) },
      };
    }),

  toggleAllDates: () =>
    set((state) => ({
      filter: {
        ...state.filter,
        date: state.filter.date === null ? formatDate(new Date()) : null,
      },
    })),

  setDate: (date) =>
    set((state) => ({
      filter: { ...state.filter, date },
    })),
}));
