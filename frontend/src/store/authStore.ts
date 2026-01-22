import { create } from "zustand";
import { clearTokens, getAccessToken } from "@/lib/auth";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId?: number;

  setAuth: (userId: number) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: undefined,

  setAuth: (userId) => {
    set({
      isAuthenticated: true,
      isLoading: false,
      userId,
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  logout: () => {
    clearTokens();
    set({
      isAuthenticated: false,
      isLoading: false,
      userId: undefined,
    });
  },

  initialize: () => {
    const token = getAccessToken();
    if (token) {
      set({
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
