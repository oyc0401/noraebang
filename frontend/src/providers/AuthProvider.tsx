"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/api/config";
import { useAuthStore } from "@/store/authStore";

interface MobileAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function anonymousLogin(): Promise<MobileAuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/mobile/anonymous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anonymous login failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<MobileAuthResponse>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, setTokens } = useAuthStore();
  const initializing = useRef(false);

  useEffect(() => {
    if (accessToken || initializing.current) {
      return;
    }

    initializing.current = true;

    anonymousLogin()
      .then((data) => {
        setTokens(data.accessToken, data.refreshToken, data.expiresIn);
      })
      .catch((error) => {
        console.error("Anonymous login failed:", error);
      })
      .finally(() => {
        initializing.current = false;
      });
  }, [accessToken, setTokens]);

  return <>{children}</>;
}
