import { create } from "zustand";
import type { DateRange, StatisticsFilter } from "./types";

type Tab = "overview" | "searches" | "clicks" | "history";

type StatisticsStoreState = {
  filter: StatisticsFilter;
  setDateRange: (range: DateRange) => void;

  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // 선택된 검색어 (상세 보기용)
  selectedQuery: string | null;
  setSelectedQuery: (query: string | null) => void;

  // 선택된 항목들 (bulk delete용)
  selectedHistoryIds: number[];
  toggleHistoryId: (id: number) => void;
  clearHistoryIds: () => void;
  setHistoryIds: (ids: number[]) => void;

  selectedClickIds: number[];
  toggleClickId: (id: number) => void;
  clearClickIds: () => void;
  setClickIds: (ids: number[]) => void;
};

export const useStatisticsStore = create<StatisticsStoreState>((set) => ({
  filter: {
    dateRange: "7days",
  },
  setDateRange: (dateRange) =>
    set((state) => ({
      filter: { ...state.filter, dateRange },
    })),

  activeTab: "overview",
  setActiveTab: (activeTab) => set({ activeTab }),

  selectedQuery: null,
  setSelectedQuery: (selectedQuery) => set({ selectedQuery }),

  selectedHistoryIds: [],
  toggleHistoryId: (id) =>
    set((state) => ({
      selectedHistoryIds: state.selectedHistoryIds.includes(id)
        ? state.selectedHistoryIds.filter((i) => i !== id)
        : [...state.selectedHistoryIds, id],
    })),
  clearHistoryIds: () => set({ selectedHistoryIds: [] }),
  setHistoryIds: (ids) => set({ selectedHistoryIds: ids }),

  selectedClickIds: [],
  toggleClickId: (id) =>
    set((state) => ({
      selectedClickIds: state.selectedClickIds.includes(id)
        ? state.selectedClickIds.filter((i) => i !== id)
        : [...state.selectedClickIds, id],
    })),
  clearClickIds: () => set({ selectedClickIds: [] }),
  setClickIds: (ids) => set({ selectedClickIds: ids }),
}));
