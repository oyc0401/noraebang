"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/api/config";
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function anonymousLogin(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Anonymous login failed");
  }

  return response.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setLoading } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initAuth() {
      try {
        const existingToken = getAccessToken();
        const existingRefreshToken = getRefreshToken();

        if (existingToken && existingRefreshToken) {
          setAuth(0);
          return;
        }

        const result = await anonymousLogin();
        setTokens(result.accessToken, result.refreshToken);
        setAuth(0);
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setLoading(false);
      }
    }

    initAuth();
  }, [setAuth, setLoading]);

  return <>{children}</>;
}
