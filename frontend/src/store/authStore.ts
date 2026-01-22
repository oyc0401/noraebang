import { create } from "zustand";
import {
  clearTokens,
  getAccessToken,
  getDeviceId,
  setTokens,
} from "@/lib/auth";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId?: number;
  deviceId?: string;

  setAuth: (userId: number, deviceId: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: undefined,
  deviceId: undefined,

  setAuth: (userId, deviceId) => {
    set({
      isAuthenticated: true,
      isLoading: false,
      userId,
      deviceId,
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
      deviceId: undefined,
    });
  },

  initialize: () => {
    const token = getAccessToken();
    const deviceId = getDeviceId();
    if (token && deviceId) {
      set({
        isAuthenticated: true,
        isLoading: false,
        deviceId,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
