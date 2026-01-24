"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/api/config";
import { ApiError, customFetch } from "@/api/client";
import type { ProfileResponseDto } from "@/api/model/models";
import { useAuthStore } from "@/store/authStore";

interface AuthResponse {
  expiresIn: number;
  success: boolean;
}

async function anonymousLogin(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Anonymous login failed");
  }

  return response.json();
}

async function fetchProfile(): Promise<ProfileResponseDto> {
  return customFetch<ProfileResponseDto>({
    url: "/auth/profile",
    method: "GET",
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, setLoading, setAccessTokenExpiresAt } =
    useAuthStore();
  const initializing = useRef(false);

  useEffect(() => {
    if (isAuthenticated || initializing.current) {
      return;
    }

    initializing.current = true;
    setLoading(true);

    async function initAuth() {
      try {
        const profile = await fetchProfile();
        setAuth(profile.id);
        return;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try {
            const authResponse = await anonymousLogin();
            if (authResponse.expiresIn) {
              const expiresAt = Date.now() + authResponse.expiresIn * 1000;
              setAccessTokenExpiresAt(expiresAt);
            }
            const profile = await fetchProfile();
            setAuth(profile.id);
            return;
          } catch (loginError) {
            console.error("Anonymous login failed:", loginError);
          }
        } else {
          console.error("Auth initialization failed:", error);
        }
        setLoading(false);
      }
    }

    initAuth().finally(() => {
      initializing.current = false;
    });
  }, [isAuthenticated, setAuth, setLoading, setAccessTokenExpiresAt]);

  return <>{children}</>;
}
