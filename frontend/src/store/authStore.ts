import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;

  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: undefined,
      refreshToken: undefined,
      accessTokenExpiresAt: undefined,

      setTokens: (accessToken, refreshToken, expiresIn) => {
        set({
          accessToken,
          refreshToken,
          accessTokenExpiresAt: Date.now() + expiresIn * 1000,
        });
      },

      clearTokens: () => {
        set({
          accessToken: undefined,
          refreshToken: undefined,
          accessTokenExpiresAt: undefined,
        });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
