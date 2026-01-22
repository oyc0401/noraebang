import { create } from "zustand";
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId?: number;

  setAuth: (userId: number) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
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
    set({
      isAuthenticated: false,
      isLoading: false,
      userId: undefined,
    });
  },
}));
