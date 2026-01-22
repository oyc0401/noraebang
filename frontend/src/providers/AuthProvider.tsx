"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/api/config";
import {
  getAccessToken,
  getDeviceId,
  getRefreshToken,
  setTokens,
} from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  expiresIn: number;
}

async function anonymousLogin(deviceId?: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
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
        const existingDeviceId = getDeviceId();

        if (existingToken && existingRefreshToken && existingDeviceId) {
          setAuth(0, existingDeviceId);
          return;
        }

        const result = await anonymousLogin(existingDeviceId);
        setTokens(result.accessToken, result.refreshToken, result.deviceId);
        setAuth(0, result.deviceId);
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setLoading(false);
      }
    }

    initAuth();
  }, [setAuth, setLoading]);

  return <>{children}</>;
}
