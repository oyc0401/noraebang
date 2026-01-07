import { create } from "zustand";
import type { SearchResultDto } from "@/api/model/models";

interface SearchState {
  isSearchActive: boolean;
  query: string;
  results: SearchResultDto[];
  setSearchActive: (active: boolean) => void;
  setQuery: (query: string) => void;
  setResults: (results: SearchResultDto[]) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isSearchActive: false,
  query: "",
  results: [],
  setSearchActive: (active) => set({ isSearchActive: active }),
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  clearSearch: () => set({ isSearchActive: false, query: "", results: [] }),
}));
