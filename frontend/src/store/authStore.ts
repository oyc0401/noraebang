import { create } from "zustand";
import { customFetch } from "@/api/client";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId?: number;

  setAuth: (userId: number) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
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

  clearAuth: () => {
    set({
      isAuthenticated: false,
      isLoading: false,
      userId: undefined,
    });
  },

  logout: async () => {
    try {
      await customFetch<void>({
        url: "/auth/logout",
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    set({
      isAuthenticated: false,
      isLoading: false,
      userId: undefined,
    });
  },
}));
