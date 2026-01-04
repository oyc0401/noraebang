import { create } from "zustand";
import type { SearchResultDto } from "@/api/model";

interface SearchState {
  query: string;
  results: SearchResultDto[];
  setQuery: (query: string) => void;
  setResults: (results: SearchResultDto[]) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  results: [],
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  clearSearch: () => set({ query: "", results: [] }),
}));
